# Team: Andrai- Rufus Derrick R, Sathyapriyaa R, Roshan Darran R
#Topic: 1.1 LLM as a Judge !! 

# AgentNeo
**Empower Your AI Applications with Unparalleled Observability and Optimization**

AgentNeo is an advanced, open-source **Agentic AI Application Observability, Monitoring, and Evaluation Framework**. Designed to elevate your AI development experience, AgentNeo provides deep insights into your AI agents, Large Language Model (LLM) calls, and tool interactions. By leveraging AgentNeo, you can build more efficient, cost-effective, and high-quality AI-driven solutions.

## ⚡ AgentNeo Hackathon

## 🛠 Steps involved:

- **Python**: Version 3.8 or higher

### 1. Installation of packages

Installation of necessary packages, the list of packages are listed in the requirements.txt file.
```python
pip install -r requirements.txt
```
### 2. Import the Necessary Components

After installation of the packages, import the necessary components required to run the model.
Using import .

### 3.Data prepocessing

Initializing the data, with user_question, LLM response, and Human response

```python
load_dotenv()

# Specify the file path
file_path = "Dataset.csv"

# Load the CSV file
df = pd.read_csv(file_path)

# Extract columns into lists
user_questions = df["User Question"].tolist()
llm_responses = df["LLM Response"].tolist()
human_responses = df["Human Response"].tolist()
```


### 4. LLM Initialization

For LLM as a judge, we used a Hugging Face Model.

```python
llm = HuggingFaceHub(
    repo_id="huggingfaceh4/zephyr-7b-alpha",
    model_kwargs={"temperature": 0.5, "max_length": 64,"max_new_tokens":512}
)
```

### 5. Response Evaluation

We have done a detailed prompt Engineering and , come up with a solution to handle this case. For LLM as a Judge.

```python
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
```

### Unique Feature
Our LLM Judge as included a feature of Hallucination rate, to evaluate the LLM and Human response. As we can understand, that major
results in current AI Model solutions deviate because of bias or Hallucination of Model. So to have score will improve our performance metrics.



Thank you for giving this opportunity to be a part of this Hackathon!


