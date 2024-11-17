import os
import unittest
from agentneo.evaluation.metrics import execute_ragchecker_evaluation

class TestRagcheckerEvaluation(unittest.TestCase):
    def test_ragchecker_evaluation(self):
        input_file="tests/checking_inputs.json"
        metric_type="generator"
        config={
            "input_file": input_file,
            "metric_type": metric_type,
            "model": "gpt-4o-mini",
            "api_key": os.environ["OPENAI_API_KEY"],
        }
        results = execute_ragchecker_evaluation(config=config)
        self.assertEqual(results['metric_name'], 'ragchecker_evaluation')
        self.assertEqual(results['config']['metric_type'], 'generator')
        self.assertEqual(results['config']['model'], 'gpt-4o-mini')
        self.assertGreaterEqual(results['result']['score'], 0.0)
        self.assertLessEqual(results['result']['score'], 1.0)
        expected_keys = {
            'context_utilization',
            'noise_sensitivity_in_relevant',
            'noise_sensitivity_in_irrelevant',
            'hallucination',
            'self_knowledge',
            'faithfulness'
        }
        actual_keys = set(results['result']['generator_metrics'].keys())
        
        self.assertSetEqual(expected_keys, actual_keys)
if __name__ == '__main__':
    unittest.main()

