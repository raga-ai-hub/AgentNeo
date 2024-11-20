import json
from typing import Dict, Any
from langchain_openai.chat_models import ChatOpenAI
from langchain_openai import OpenAIEmbeddings

try:
    from datasets import Dataset
except ImportError:
    raise ImportError("Please install `datasets`: pip install datasets")

try:
    from ragas import evaluate
    from ragas.metrics import (
        context_precision,
        context_recall,
        faithfulness,
        context_entity_recall,
        ResponseRelevancy,
    )
except ImportError:
    raise ImportError(
        "Please install `ragas` and `datasets`: pip install ragas"
    )


def read_json_data(file_path: str):
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            data = json.load(file)
            column_data = {key: [example[key] for example in data] for key in data[0]}
            dataset = Dataset.from_dict(column_data)
        return dataset
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error reading JSON file: {e}")
        return []


def execute_ragas_evaluation(config: Dict[str, Any]) -> Dict[str, float]:

    input_file = config.get("input_file")
    model_name = config.get("model", "gpt-3.5-turbo-0125")
    embeddings_name = config.get("embeddings", "text-embedding-3-small")
    metrics = config.get(
        "metrics",
        [
            "context_precision",
            "context_recall",
            "faithfulness",
            "answer_relevancy",
            "context_entity_recall",
        ],
    )

    llm = ChatOpenAI(model=model_name)
    embeddings = OpenAIEmbeddings(model=embeddings_name)

    available_metrics = {
        "context_precision": context_precision,
        "context_recall": context_recall,
        "faithfulness": faithfulness,
        "context_entity_recall": context_entity_recall,
        "answer_relevancy": ResponseRelevancy(embeddings=embeddings),
    }

    metric_list = [
        available_metrics[metric] for metric in metrics if metric in available_metrics
    ]
    metrics = [metric for metric in metrics if metric in available_metrics]

    if not metric_list:
        raise ValueError("No valid metrics provided in the configuration.")

    try:
        test_cases = read_json_data(input_file)
    except Exception as e:
        raise ValueError(f"Error reading input file: {e}")

    response = evaluate(test_cases, metrics=metric_list, llm=llm, embeddings=embeddings)

    result = {}
    total_score = 0
    for metric in metrics:
        result[metric] = round(response[metric][0], 2)
        total_score += response[metric][0]
    result["score"] = round(total_score / len(metrics), 2)
    result["reason"] = ""

    return {"metric_name": "ragas_evaluation", "config": config, "result": result}
