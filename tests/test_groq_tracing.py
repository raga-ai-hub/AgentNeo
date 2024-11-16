import unittest
from agentneo import AgentNeo, Tracer
from groq import Groq
import ast
from agentneo.data import LLMCallModel

class GroqTracing(unittest.TestCase):
    def test_groq_tracing(self):
        # Initialize AgentNeo session
        neo_session = AgentNeo(session_name="test_session")
        neo_session.create_project(project_name="test_project")

        # Start tracing
        tracer = Tracer(session=neo_session)
        tracer.start()
        

        client = Groq(api_key="$$$$")

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            max_tokens=512,
            messages=[{"role": "user", "content": "Test query?"}],
            temperature=0.7)

        # Stop tracing
        tracer.stop()

        # Verify that the LLM call was traced
        with neo_session.Session() as session:
            llm_calls = session.query(LLMCallModel).filter_by(trace_id=tracer.trace_id).all()
            print(llm_calls)
            self.assertGreater(len(llm_calls), 0)
            self.assertEqual(ast.literal_eval(llm_calls[0].input_prompt)[0]['content'], "Test query?")

if __name__ == '__main__':
    unittest.main()