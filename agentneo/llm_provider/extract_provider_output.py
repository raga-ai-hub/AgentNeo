from agentneo.data import LLMCall
from agentneo.utils import calculate_cost, convert_usage_to_dict
from importlib import resources
import json


# Load the Json configuration
try:
    with open("agentneo/configs/model_costs.json", "r") as file:
        config = json.load(file)
except FileNotFoundError:
    with resources.open_text("agentneo.configs", "model_costs.json") as file:
        config = json.load(file)


def extract_openai_output(result):
    model_name = result.model
    output_response = result.choices[0].message.content
    output_response = output_response if output_response else ""
    function_call = result.choices[0].message.function_call
    tool_call = result.choices[0].message.tool_calls
    tool_call = tool_call if tool_call else function_call
    token_usage = result.usage
    token_usage = convert_usage_to_dict(token_usage)
    cost = calculate_cost(
        token_usage,
        input_cost_per_token=config[model_name]["input_cost_per_token"],
        completion_cost_per_token=config[model_name]["output_cost_per_token"],
    )

    llm_data = LLMCall(
        name="",
        model_name=model_name,
        input_prompt="",
        output_response=output_response,
        token_usage=token_usage,
        cost=cost,
        tool_call=(
            {"arguments": json.loads(tool_call.arguments), "name": tool_call.name}
            if tool_call
            else None
        ),
    )
    return llm_data


def extract_litellm_output(result):
    model_name = result.model
    output_response = result.choices[0].message.content
    function_call = result.choices[0].message.function_call
    tool_call = result.choices[0].message.tool_calls
    tool_call = tool_call if tool_call else function_call
    token_usage = result.usage
    token_usage = convert_usage_to_dict(token_usage)
    cost = calculate_cost(
        token_usage,
        input_cost_per_token=config[model_name]["input_cost_per_token"],
        completion_cost_per_token=config[model_name]["output_cost_per_token"],
    )

    llm_data = LLMCall(
        name="",
        model_name=model_name,
        input_prompt="",
        output_response=output_response,
        tool_call=(
            {"arguments": json.loads(tool_call.arguments), "name": tool_call.name}
            if tool_call
            else None
        ),
        token_usage=token_usage,
        cost=cost,
    )
    return llm_data
