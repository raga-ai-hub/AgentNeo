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
    Evaluates the first LLM and human response against the first user question and appends the evaluation to a list.

    Args:
        user_questions (list): List of user questions.
        llm_responses (list): List of LLM responses.
        human_responses (list): List of human responses.
        llm (object): An object or function capable of generating responses (e.g., an LLM instance with a predict method).

    Returns:
        dict: A dictionary containing the question, responses, and evaluation for the first item.
    """
    # Process only the first item in the lists
    if not (user_questions and llm_responses and human_responses):
        raise ValueError("All input lists must be non-empty.")

    uq, llm_resp, hr = user_questions[0], llm_responses[0], human_responses[0]

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

    # Return the result as a dictionary
    return {
        "question": uq,
        "llm_response": llm_resp,
        "human_response": hr,
        "judge_llm_evaluation": answer
    }


evaluations = evaluate_responses(user_questions, llm_responses, human_responses, llm)
print(evaluations)