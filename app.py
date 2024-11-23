"""Finance Dataset Preprocessing"""

import os
import pandas as pd
from langchain.llms import HuggingFaceHub
from dotenv import load_dotenv

load_dotenv()

# Specify the file path
file_path = "Dataset.csv"

# Load the CSV file
df = pd.read_csv(file_path)

# Extract columns into lists
user_questions = df["User Question"].tolist()
llm_responses = df["LLM Response"].tolist()
human_responses = df["Human Response"].tolist()

# Print or use the lists as needed
print("User Questions:", user_questions)
print("LLM Responses:", llm_responses)
print("Human Responses:", human_responses)

"""Judge LLM Initialisation"""


os.environ["HUGGINGFACEHUB_API_TOKEN"] = os.getenv('HUGGINGFACEHUB_API_TOKEN')


llm = HuggingFaceHub(
    repo_id="huggingfaceh4/zephyr-7b-alpha",
    model_kwargs={"temperature": 0.5, "max_length": 64,"max_new_tokens":512}
)



"""Response Evaluation"""


def evaluate_responses(user_questions, llm_responses, human_responses, llm):
    """
    Evaluates LLM and human responses against user questions and appends the evaluation to a list.

    Args:
        user_questions (list): List of user questions.
        llm_responses (list): List of LLM responses.
        human_responses (list): List of human responses.
        llm (object): An object or function capable of generating responses (e.g., an LLM instance with a predict method).

    Returns:
        list: A list of dictionaries containing the question, responses, and evaluation.
    """
    evaluations = []

    for uq, llm_resp, hr in zip(user_questions, llm_responses, human_responses):
        # Create the evaluation prompt
        prompt = f"""
         <|system|>
        "You are a LLM response evaluator. The user will provide you an input_query {uq}, LLM response{llm_resp}, "
            "and Human response{hr}. You have to provide the following:\n\n"
            "1. Total rating out of 5 (0 being the worst, 5 being the best).\n"
            "2. Hallucination rate out of 5 (0 being the best, 5 being the worst).\n"
            "3. Constructive feedback for the LLM, including areas for improvement.\n"
            "4. Percentage of error generated.\n"
            "5. Possible solutions to improve the LLM response.\n\n"
       </s>
        <|user|>
        </s>
        <|assistant|>
       """

        # Get the evaluation from the LLM
        response = llm.predict(prompt)
        answer = response.split("<|assistant|>")[-1].strip()

        # Append the result to the evaluations list
        evaluations.append({
            "question": uq,
            "llm_response": llm_resp,
            "human_response": hr,
            "judge_llm_evaluation": answer
        })
    print(answer)
    return evaluations

evaluations = evaluate_responses(user_questions, llm_responses, human_responses, llm)
print(evaluations)