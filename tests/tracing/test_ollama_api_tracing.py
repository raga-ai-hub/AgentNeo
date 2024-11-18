import unittest
import requests
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from agentneo import AgentNeo, Tracer
from agentneo.data import LLMCallModel


class TestOllamaTracing(unittest.TestCase):
    def test_ollama_api_tracing(self):
        # Initialize AgentNeo session
        neo_session = AgentNeo(session_name="test_session_ollama")
        neo_session.create_project(project_name="test_project_ollama")

        # Start tracing
        tracer = Tracer(session=neo_session)
        tracer.start()

        # Define the ollama_call function with tracing
        @tracer.trace_llm_ollama(name="ollama_llm_call_test")
        def ollama_call(prompt, model="llama3.2", stream=False):
            params = {
                "model": model,
                "prompt": prompt,
                "stream": stream
            }
            url = "http://localhost:11434/api/generate"
            response = requests.post(
                url=url,
                json=params
            )
            result = response.json()
            return result

        # Perform a test call
        test_prompt = "What is the capital of France?"
        result = ollama_call(test_prompt)

        # Stop tracing
        tracer.stop()

        # Verify that the LLM call was traced and prompt is correctly recorded
        with neo_session.Session() as session:
            llm_calls = session.query(LLMCallModel).filter_by(trace_id=tracer.trace_id).all()
            self.assertGreater(len(llm_calls), 0)
            self.assertEqual(llm_calls[0].input_prompt, test_prompt)
            self.assertIsNotNone(llm_calls[0].output)
            self.assertIn("Paris", llm_calls[0].output)

if __name__ == '__main__':
    unittest.main()