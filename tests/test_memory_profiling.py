import unittest
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agentneo import AgentNeo, Tracer
from agentneo.data import LLMCallModel


class TestMemoryProfiling(unittest.TestCase):
    def test_memory_profiling(self):
        # Initialize AgentNeo session
        neo_session = AgentNeo(session_name="test_session_memory_profiling3")
        neo_session.create_project(project_name="test_project_memory_profiling3")

        # Start tracing
        tracer = Tracer(session=neo_session)
        tracer.start()

        # Define a function with tracing that performs a sample LLM call
        @tracer.trace_llm(name="memory_profiling_llm_call_test")
        def sample_llm_call():
            import openai
            openai.api_key = "YOUR-OPENAI-API-KEY"

            prompt = "What is the capital of France?"
            response = openai.chat.completions.create(
            model="gpt-4-0125-preview",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            )
            return response

        # Perform a test call
        result = sample_llm_call()

        # Stop tracing
        tracer.stop()

        # Verify that the LLM call was traced and memory profiling data is present
        with neo_session.Session() as session:
            llm_calls = session.query(LLMCallModel).filter_by(trace_id=tracer.trace_id).all()
            self.assertGreater(len(llm_calls), 0)
            llm_call = llm_calls[0]
            self.assertIsNotNone(llm_call.peak_memory_usage)
            self.assertIsNotNone(llm_call.heap_summary)
            self.assertIsNotNone(llm_call.gc_summary)
            self.assertGreater(llm_call.peak_memory_usage, 0)

if __name__ == '__main__':
    unittest.main()