from typing import Tuple
import asyncio
from all_llm_provider import get_llm_response
from config import initialize_tracing
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

tracer = initialize_tracing()

# Define test cases for each provider
TEST_CASES = {
    "openai": {
        "models": ["gpt-4o-mini"],
        "async": [True, False]
    },

    "anthropic": {
        "models": ["claude-3-opus-20240229"],
        "async": [True, False]
    },

    "groq": {
        "models": ["llama3-8b-8192"],
        "async": [True, False]
    },

    "litellm": {
        "models": ["gpt-4o-mini"],
        "async": [True, False]
    },

    "azure": {
        "models": ["azure-gpt-4o-mini"],
        "async": [True, False]
    },

    "google": {
        "models": ["gemini-1.5-flash"],
        "async": [True, False]
    },

    "chat_google": {
        "models": ["gemini-1.5-flash"],
        "async": [True, False]
    },

    # TODO:(permission): "openai_beta": {
    #     "models": ["gpt-4"],
    #     "async": [False]  # Beta does not support async
    # },

    #TODO(access error)
    # "vertexai": {
    #     "models": ["gemini-1.5-flash", "gemini-1.5-pro"],
    #     "async": [True, False]
    # },
    #TODO(access error)
    # "chat_vertexai": {
    #     "models": ["gemini-1.5-flash", "gemini-1.5-pro"],
    #     "async": [True, False]
    # },

}

SAMPLE_PROMPT = "Hello, how are you? Explain in one sentence."
TEMPERATURE = 0.7
MAX_TOKENS = 100

async def test_provider(provider: str, model: str, async_mode: bool, syntax: str = None) -> Tuple[bool, str]:
    """Test a single provider configuration"""
    try: 
        kwargs = {}
        if syntax:
            kwargs["syntax"] = syntax
        
        response = await get_llm_response(
            prompt=SAMPLE_PROMPT,
            model=model,
            provider=provider,
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
            async_llm=async_mode,
        )
        
        if response:
            return True, ""
        else:
            error_msg = f"No response received from {provider}/{model}"
            print(error_msg)
            return False, error_msg
            
    except Exception as e:
        error_msg = f"Error testing {provider}/{model}: {str(e)}"
        print(error_msg)
        return False, error_msg

async def run_tests():
    """Run all test cases"""
    
    for provider, config in TEST_CASES.items():
        print('-'*50)
        print('provider: ', provider)
        p, f = 0, 0
        models = config["models"]
        syntax_options = config.get("syntax", [None])
        async_options = config["async"]
        
        for model in models:
            for syntax in syntax_options:
                for async_mode in async_options:
                    success, message = await test_provider(
                        provider=provider,
                        model=model,
                        async_mode=async_mode,
                        syntax=syntax
                    )
                    if success:
                        p=p+1
                    else:
                        f=f+1
        print('total: ', p+f, '\npass: ', p, '\nfail: ', f)
    

if __name__ == "__main__":
    asyncio.run(run_tests())