import os
import time
import argparse
from langgraph.graph import StateGraph, END
from langchain_core.prompts import PromptTemplate
from langchain_community.tools.tavily_search import TavilySearchResults
from typing import TypedDict, Annotated, List, Dict, Any, Optional
import operator

from dotenv import load_dotenv
# Load environment variables from .env file
load_dotenv()

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..')))

# Import RagaAI Catalyst for tracing
from ragaai_catalyst import RagaAICatalyst, init_tracing
from ragaai_catalyst.tracers import Tracer

# Initialize RagaAI Catalyst
def initialize_catalyst():
    """Initialize RagaAI Catalyst using environment credentials."""
    catalyst = RagaAICatalyst(
        access_key=os.getenv('RAGAAI_CATALYST_ACCESS_KEY'), 
        secret_key=os.getenv('RAGAAI_CATALYST_SECRET_KEY'), 
        base_url=os.getenv('RAGAAI_CATALYST_BASE_URL')
    )
    
    tracer = Tracer(
        project_name= 'testing_v', #os.getenv("RAGAAI_PROJECT_NAME"),
        dataset_name= 'testing_v_dataset', #os.getenv("RAGAAI_DATASET_NAME"),
        tracer_type="agentic/langgraph",
    )
    
    init_tracing(catalyst=catalyst, tracer=tracer)


# Initialize language models and tools
def initialize_models(model_name: str = "gpt-4o-mini", provider: str = "openai", temperature: float = 0.5, max_results: int = 2):
    """Initialize the language model and search tool based on the provider."""
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(model=model_name, temperature=temperature)

    elif provider == "google_genai":
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(model=model_name, temperature=temperature)
    
    # elif provider == "google_vertexai":
    #     from langchain_google_vertexai import ChatVertexAI
    #     llm = ChatVertexAI(model=model_name, google_api_key=os.getenv("GOOGLE_API_KEY"))

    # elif provider == "azure":
    #     # Example for Azure OpenAI (adjust as needed)
    #     llm = ChatOpenAI(
    #         model=model_name,
    #         temperature=temperature,
    #         openai_api_base=os.getenv("AZURE_OPENAI_ENDPOINT"),
    #         openai_api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    #         openai_api_version="2024-08-01-preview"
    #     )
    # elif provider == "anthropic":
    #     from langchain_anthropic import ChatAnthropic
    #     llm = ChatAnthropic(model=model_name, temperature=temperature)
    else:
        raise ValueError(f"Unsupported provider: {provider}")
    
    tavily_tool = TavilySearchResults(max_results=max_results)
    return llm, tavily_tool

# Initialize default instances
initialize_catalyst()

# State structure
class ResearchState(TypedDict):
    topic: str  
    sub_questions: List[str]  
    answers: List[dict] 
    synthesis: str 
    criticism: str 
    iteration: Annotated[int, operator.add]  
    status: str

# Nodes
def generate_sub_questions(state: ResearchState) -> ResearchState:
    """Generate sub-questions based on the topic."""
    prompt = PromptTemplate(
        input_variables=["topic"],
        template="Given the topic '{topic}', generate 3 specific sub-questions to guide research."
    )
    response = llm.invoke(prompt.format(topic=state["topic"]))
    questions = [q.strip() for q in response.content.split("\n") if q.strip()]
    return {"sub_questions": questions, "status": "generated_questions"}

def research_sub_questions(state: ResearchState) -> ResearchState:
    """Research each sub-question using Tavily."""
    answers = []
    for question in state["sub_questions"]:
        try:
            search_results = tavily_tool.invoke(question)
            
            # Check if search_results is a list as expected
            if isinstance(search_results, list):
                # Process search results normally
                prompt = PromptTemplate(
                    input_variables=["question", "search_results"],
                    template="Answer '{question}' concisely based on: {search_results}"
                )
                answer = llm.invoke(prompt.format(
                    question=question,
                    search_results=[r["content"] for r in search_results]
                ))
            else:
                # Handle case where search failed but didn't raise an exception
                print(f"Search failed for question: {question}. Got: {search_results}")
                answer = llm.invoke(f"Unable to search for '{question}'. Please provide a general answer based on your knowledge.")
                
            answers.append({
                "question": question,
                "answer": answer.content,
                "sources": [r["url"] for r in search_results] if isinstance(search_results, list) else ["No sources due to search error"]
            })
        except Exception as e:
            print(f"Error researching question '{question}': {str(e)}")
            # Fallback to answering without search
            answer = llm.invoke(f"Unable to search for '{question}'. Please provide a general answer based on your knowledge.")
            answers.append({
                "question": question,
                "answer": answer.content,
                "sources": ["No sources due to search error"]
            })
    
    return {"answers": answers, "status": "researched"}

def synthesize_findings(state: ResearchState) -> ResearchState:
    """Synthesize answers into a cohesive report."""
    prompt = PromptTemplate(
        input_variables=["topic", "answers"],
        template="Synthesize a 200-word report on '{topic}' using these findings:\n{answers}"
    )
    synthesis = llm.invoke(prompt.format(
        topic=state["topic"],
        answers="\n".join([f"Q: {a['question']}\nA: {a['answer']}" for a in state["answers"]])
    ))
    return {"synthesis": synthesis.content, "status": "synthesized"}

def critique_synthesis(state: ResearchState) -> ResearchState:
    """Critique the synthesis for completeness and accuracy."""
    prompt = PromptTemplate(
        input_variables=["topic", "synthesis", "answers"],
        template="Critique this report on '{topic}':\n{synthesis}\nBased on: {answers}\nReturn 'pass' or issues."
    )
    critique = llm.invoke(prompt.format(
        topic=state["topic"],
        synthesis=state["synthesis"],
        answers="\n".join([f"Q: {a['question']}\nA: {a['answer']}" for a in state["answers"]])
    ))
    return {"criticism": critique.content}

def refine_synthesis(state: ResearchState) -> ResearchState:
    """Refine the synthesis based on critique."""
    prompt = PromptTemplate(
        input_variables=["topic", "synthesis", "critique", "answers"],
        template="Refine this report on '{topic}':\n{synthesis}\nFix these issues: {critique}\nUsing: {answers}"
    )
    refined = llm.invoke(prompt.format(
        topic=state["topic"],
        synthesis=state["synthesis"],
        critique=state["criticism"],
        answers="\n".join([f"Q: {a['question']}\nA: {a['answer']}" for a in state["answers"]])
    ))
    return {"synthesis": refined.content, "iteration": state["iteration"] + 1, "status": "refined"}

# Conditional logic
def should_refine(state: ResearchState) -> str:
    if "pass" in state["criticism"].lower() or state["iteration"] >= 2:
        return "end"
    return "refine"

# State graph
workflow = StateGraph(ResearchState)
workflow.add_node("generate", generate_sub_questions)
workflow.add_node("research", research_sub_questions)
workflow.add_node("synthesize", synthesize_findings)
workflow.add_node("critique", critique_synthesis)
workflow.add_node("refine", refine_synthesis)

# Workflow
workflow.set_entry_point("generate")
workflow.add_edge("generate", "research")
workflow.add_edge("research", "synthesize")
workflow.add_edge("synthesize", "critique")
workflow.add_conditional_edges(
    "critique",
    should_refine,
    {"refine": "refine", "end": END}
)
workflow.add_edge("refine", "critique")

# Compile the workflow
app = workflow.compile()

def run_research_assistant(topic: str = "Impact of AI on healthcare by 2030", print_results: bool = True) -> Dict[str, Any]:
    """Run the research assistant workflow with the given topic.
    
    Args:
        topic: The research topic to investigate
        print_results: Whether to print the results to the console
        
    Returns:
        The final state of the workflow
    """
    # Initialize the state
    initial_state = {
        "topic": topic,
        "sub_questions": [],
        "answers": [],
        "synthesis": "",
        "criticism": "",
        "iteration": 0,
        "status": "start"
    }
    
    # Start timing
    start_time = time.time()
    
    # Run the workflow with tracing
    if print_results:
        print(f"Starting the Personal Research Assistant for topic: '{topic}'...")
    
    result = app.invoke(initial_state)
    
    # Calculate duration
    duration = time.time() - start_time
    
    # Print results if requested
    if print_results:
        print("\nFinal Research Report:")
        print(f"Topic: {result['topic']}")
        print("\nSub-Questions:")
        for i, question in enumerate(result['sub_questions'], 1):
            print(f"  {i}. {question}")
        
        print("\nResearch Findings:")
        for i, ans in enumerate(result["answers"], 1):
            print(f"\nQ{i}: {ans['question']}")
            print(f"A: {ans['answer']}")
            print(f"Sources: {ans['sources']}")
        
        print(f"\nSynthesis:\n{result['synthesis']}")
        print(f"\nCritique: {result['criticism']}")
        print(f"Iterations: {result['iteration']}")
        print(f"Total execution time: {duration:.2f} seconds")
    
    return result

if __name__ == "__main__":
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Run the Personal Research Assistant with different LLM providers.")
    parser.add_argument("--model", type=str, default="gpt-4o-mini", help="The model to use (e.g., gpt-4o-mini).")
    parser.add_argument("--provider", type=str, default="openai", help="The LLM provider (e.g., openai, azure, google).")
    parser.add_argument("--async_llm", type=bool, default=False, help="Whether to use async LLM calls.")
    parser.add_argument("--syntax", type=str, default="chat", help="The syntax to use (e.g., chat).")
    args = parser.parse_args()

    # Initialize the LLM and tools based on the provided arguments
    llm, tavily_tool = initialize_models(model_name=args.model, provider=args.provider)
    # llm, tavily_tool = initialize_models(model_name="gemini-1.5-flash", provider="google_vertexai")

    # Run the research assistant
    run_research_assistant()