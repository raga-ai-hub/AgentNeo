import json
import numpy as np
from enum import Enum
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, Any, Optional, List, Union
from ragchecker import RAGResults, RAGChecker
from ragchecker.metrics import retriever_metrics, generator_metrics, all_metrics


def calculate_overall_score(
    metrics: Dict[str, Dict[str, Union[float, np.float64]]], metric_type: str = "all"
) -> float:

    def get_weighted_score(
        metric_values: Dict[str, float], weights: Dict[str, float]
    ) -> float:
        values = [metric_values[key] / 100 for key in weights.keys()]
        weight_values = list(weights.values())
        return round(sum(v * w for v, w in zip(values, weight_values)) / sum(weight_values) * 100, 2)

    metric_weights = {
        "overall": {"precision": 1.0, "recall": 1.0, "f1": 1.0},
        "retriever": {"claim_recall": 1.0, "context_precision": 1.0},
        "generator": {
            "context_utilization": 1.0,
            "noise_sensitivity_in_relevant": 1.0,
            "noise_sensitivity_in_irrelevant": 1.0,
            "hallucination": 1.0,
            "self_knowledge": 1.0,
            "faithfulness": 1.0,
        },
    }
    invert_metrics = {
        "noise_sensitivity_in_relevant",
        "noise_sensitivity_in_irrelevant",
        "hallucination",
    }

    if metric_type.lower() == "all":
        scores = {}
        for category in ["overall", "retriever", "generator"]:
            category_metrics = {}
            metrics_dict = metrics[f"{category}_metrics"]

            for metric_name, value in metrics_dict.items():
                category_metrics[metric_name] = (
                    100 - value if metric_name in invert_metrics else value
                )

            scores[category] = get_weighted_score(
                category_metrics, metric_weights[category]
            )

        category_weights = {"overall": 0.33, "retriever": 0.33, "generator": 0.33}
        final_score = sum(scores[cat] * weight for cat, weight in category_weights.items())
        return round(final_score, 2)

    elif metric_type.lower() in ["retriever", "generator"]:
        metrics_dict = metrics[f"{metric_type}_metrics"]
        category_metrics = {}

        for metric_name, value in metrics_dict.items():
            category_metrics[metric_name] = (
                100 - value if metric_name in invert_metrics else value
            )

        return get_weighted_score(category_metrics, metric_weights[metric_type])

    else:
        raise ValueError(
            "metric_type must be one of: 'all', 'retriever', or 'generator'"
        )


class MetricType(str, Enum):
    ALL = "all"
    RETRIEVER = "retriever"
    GENERATOR = "generator"


class RAGEvaluationError(Exception):
    pass


@dataclass
class RAGConfig:
    input_file: str
    metric_type: str = MetricType.ALL
    model: str = "gpt-4o-mini"
    checker_name: str = "gpt-4o-mini"
    api_key: Optional[str] = None
    extractor_max_new_tokens: int = 1000
    extractor_api_base: Optional[str] = None
    checker_api_base: Optional[str] = None
    batch_size_extractor: int = 32
    batch_size_checker: int = 32
    openai_api_key: Optional[str] = None
    joint_check: bool = True
    joint_check_num: int = 5

    @classmethod
    def from_dict(cls, config: Dict[str, Any]) -> "RAGConfig":
        try:
            input_file = config.get("input_file")
            if isinstance(input_file, list):
                input_file = input_file
            if not input_file:
                raise RAGEvaluationError("Input file not provided in configuration")

            metric_type = config.get("metric_type", "all")
            if isinstance(metric_type, list):
                metric_type = metric_type

            return cls(
                input_file=input_file,
                metric_type=metric_type,
                model=config.get("model", cls.model),
                checker_name=config.get("checker_name", cls.checker_name),
                api_key=config.get("api_key"),
                extractor_max_new_tokens=config.get(
                    "extractor_max_new_tokens", cls.extractor_max_new_tokens
                ),
                extractor_api_base=config.get("extractor_api_base"),
                checker_api_base=config.get("checker_api_base"),
                batch_size_extractor=config.get(
                    "batch_size_extractor", cls.batch_size_extractor
                ),
                batch_size_checker=config.get(
                    "batch_size_checker", cls.batch_size_checker
                ),
                openai_api_key=config.get("openai_api_key"),
                joint_check=config.get("joint_check", cls.joint_check),
                joint_check_num=config.get("joint_check_num", cls.joint_check_num),
            )
        except Exception as e:
            raise RAGEvaluationError(f"Invalid configuration: {str(e)}")


class RAGExecutor:

    def __init__(self, config: RAGConfig):
        self.config = config
        self.validate_config()

    def validate_config(self) -> None:
        try:
            if self.config.metric_type not in [e.value for e in MetricType]:
                raise RAGEvaluationError(
                    f"Unknown metric type: {self.config.metric_type}. "
                    f"Must be one of: {', '.join([e.value for e in MetricType])}"
                )

            if self.config.extractor_max_new_tokens <= 0:
                raise RAGEvaluationError("extractor_max_new_tokens must be positive")
            if self.config.batch_size_extractor <= 0:
                raise RAGEvaluationError("batch_size_extractor must be positive")
            if self.config.batch_size_checker <= 0:
                raise RAGEvaluationError("batch_size_checker must be positive")
            if self.config.joint_check_num <= 0:
                raise RAGEvaluationError("joint_check_num must be positive")

        except RAGEvaluationError:
            raise
        except Exception as e:
            raise RAGEvaluationError(f"Configuration validation failed: {str(e)}")

    def get_selected_metrics(self) -> List:
        metric_mapping = {
            MetricType.ALL: all_metrics,
            MetricType.RETRIEVER: retriever_metrics,
            MetricType.GENERATOR: generator_metrics,
        }
        return metric_mapping[MetricType(self.config.metric_type)]

    def load_rag_results(self) -> RAGResults:
        input_path = Path(self.config.input_file)

        try:
            if not input_path.exists():
                raise RAGEvaluationError(
                    f"Input file not found: {self.config.input_file}"
                )

            with open(input_path) as fp:
                try:
                    return RAGResults.from_json(fp.read())
                except json.JSONDecodeError as e:
                    raise RAGEvaluationError(f"Invalid JSON file: {str(e)}")
        except RAGEvaluationError:
            raise
        except Exception as e:
            raise RAGEvaluationError(f"Error reading input file: {str(e)}")

    def create_checker(self) -> RAGChecker:
        try:
            return RAGChecker(
                api_key=self.config.api_key,
                extractor_name=self.config.model,
                checker_name=self.config.checker_name,
                extractor_max_new_tokens=self.config.extractor_max_new_tokens,
                extractor_api_base=self.config.extractor_api_base,
                checker_api_base=self.config.checker_api_base,
                batch_size_extractor=self.config.batch_size_extractor,
                batch_size_checker=self.config.batch_size_checker,
                openai_api_key=self.config.openai_api_key,
                joint_check=self.config.joint_check,
                joint_check_num=self.config.joint_check_num,
            )
        except Exception as e:
            raise RAGEvaluationError(f"Error initializing RAG checker: {str(e)}")

    def execute(self) -> Dict[str, Any]:
        try:
            rag_results = self.load_rag_results()
            checker = self.create_checker()
            selected_metrics = self.get_selected_metrics()

            result = checker.evaluate(rag_results, selected_metrics)
            result["score"] = calculate_overall_score(result, self.config.metric_type)
            result["reason"] = ""
            self.config.api_key = "REDACTED" if self.config.api_key else None
            self.config.openai_api_key = (
                "REDACTED" if self.config.openai_api_key else None
            )

            return {
                "metric_name": "ragchecker_evaluation",
                "config": self.config.__dict__,
                "result": result,
            }

        except RAGEvaluationError:
            raise
        except Exception as e:
            raise RAGEvaluationError(f"Error during evaluation: {str(e)}")


def execute_ragchecker_evaluation(config: Dict[str, Any]) -> Dict[str, Any]:
    try:
        rag_config = RAGConfig.from_dict(config)

        executor = RAGExecutor(rag_config)
        return executor.execute()

    except RAGEvaluationError as e:
        raise
    except Exception as e:
        raise RAGEvaluationError(f"Evaluation failed: {str(e)}")
