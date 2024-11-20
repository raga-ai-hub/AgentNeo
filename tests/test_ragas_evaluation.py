import os
import unittest
from agentneo.evaluation.metrics import execute_ragas_evaluation

os.environ['OPENAI_API_KEY']="***"

class TestRagasEvaluation(unittest.TestCase):
    def test_ragas_evaluation(self):
        input_file = "example.json"
        metrics = [
            "context_precision",
            "context_recall",
            "faithfulness",
            "answer_relevancy",
            "context_entity_recall",
        ]
        config = {
            "input_file": input_file,
            "metrics": metrics,
            "model": "gpt-3.5-turbo-0125",
            "embeddings": "text-embedding-3-small",
        }
        results = execute_ragas_evaluation(config=config)
        self.assertEqual(results["metric_name"], "ragas_evaluation")
        self.assertEqual(results["config"]["metrics"], metrics)
        self.assertEqual(results["config"]["model"], "gpt-3.5-turbo-0125")
        self.assertEqual(results["config"]["embeddings"], "text-embedding-3-small")
        self.assertGreaterEqual(results["result"]["score"], 0.0)
        self.assertLessEqual(results["result"]["score"], 1.0)
        self.assertLessEqual(results["result"]["context_precision"], 1.0)
        self.assertLessEqual(results["result"]["context_recall"], 1.0)
        self.assertLessEqual(results["result"]["faithfulness"], 1.0)
        self.assertLessEqual(results["result"]["answer_relevancy"], 1.0)
        self.assertLessEqual(results["result"]["context_entity_recall"], 1.0)


if __name__ == "__main__":
    unittest.main()
