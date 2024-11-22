import unittest
from agentneo import AgentNeo, Tracer
import ast
import os
from agentneo.data import LLMCallModel
from anthropic import Anthropic

os.environ["ANTHROPIC_API_KEY"] = "***"


class GroqTracing(unittest.TestCase):
    def test_groq_tracing(self):
        # Initialize AgentNeo session
        neo_session = AgentNeo(session_name="test_session")
        neo_session.connect_project(project_name="test_project")

        # Start tracing
        tracer = Tracer(session=neo_session)
        tracer.start()

        client = Anthropic()

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            tools=[
                {
                    "name": "get_weather",
                    "description": "Get the current weather in a given location",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "The city and state, e.g. San Francisco, CA",
                            },
                            "unit": {
                                "type": "string",
                                "enum": ["celsius", "fahrenheit"],
                                "description": "The unit of temperature, either 'celsius' or 'fahrenheit'",
                            },
                        },
                        "required": ["location"],
                    },
                },
                {
                    "name": "get_time",
                    "description": "Get the current time in a given time zone",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "timezone": {
                                "type": "string",
                                "description": "The IANA time zone name, e.g. America/Los_Angeles",
                            }
                        },
                        "required": ["timezone"],
                    },
                },
            ],
            messages=[
                {
                    "role": "user",
                    "content": "What is the weather like right now in New York? Also what time is it there?",
                }
            ],
        )

        # Stop tracing
        tracer.stop()

        # Verify that the LLM call was traced
        with neo_session.Session() as session:
            llm_calls = (
                session.query(LLMCallModel).filter_by(trace_id=tracer.trace_id).all()
            )
            self.assertGreater(len(llm_calls), 0)
            self.assertEqual(
                ast.literal_eval(llm_calls[0].input_prompt)[0]["content"],
                "What is the weather like right now in New York? Also what time is it there?",
            )


if __name__ == "__main__":
    unittest.main()
