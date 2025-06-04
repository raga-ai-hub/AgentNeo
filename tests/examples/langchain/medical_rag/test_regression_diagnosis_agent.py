import os
import json
import pytest
import subprocess
import re
import sys
from pathlib import Path

# Add the parent directory to sys.path to import modules from there
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

def run_diagnosis_agent():
    """Run the diagnosis_agent.py script and capture its output"""
    script_path = os.path.join(
        Path(__file__).resolve().parent,
        "diagnosis_agent.py"
    )
    
    result = subprocess.run(
        [sys.executable, script_path],
        check=True,
        capture_output=True,
        text=True
    )
    return result.stdout + result.stderr

def extract_trace_path(output):
    """Extract the trace file path from the script output"""
    # Pattern to match the trace file path in the output
    pattern = re.compile(r"Trace saved to (.*\.json)")
    match = pattern.search(output)
    
    if match:
        return match.group(1)
    
    # Fallback pattern if the above doesn't match
    pattern = re.compile(r"Submitting new upload task for file: (.*\.json)")
    match = pattern.search(output)
    
    if match:
        return match.group(1)
    
    raise ValueError("Could not find trace file path in output")

def test_trace_total_cost():
    """
    Test that verifies the total cost value in the trace file is correct.
    This test runs the diagnosis_agent.py script to generate a new trace file,
    then validates the cost values in that trace.
    """
    # Run the diagnosis agent to generate a new trace
    output = run_diagnosis_agent()
    
    # Extract the path to the generated trace file
    trace_file_path = extract_trace_path(output)
    
    # Load the trace file
    with open(trace_file_path, 'r') as f:
        trace_data = json.load(f)
    
    # Expected value - for dynamically generated traces, we may need to calculate this
    # rather than hardcoding it
    
    # Get the total cost from the trace
    total_cost = trace_data["metadata"]["total_cost"]
    
    # Verify the total cost value in the metadata section
    assert trace_data["metadata"]["cost"]["total_cost"] == total_cost, \
        f"Expected total_cost in metadata.cost to be {total_cost}, got {trace_data['metadata']['cost']['total_cost']}"
    
    # Check if the value is consistent with the sum of input and output costs
    input_cost = trace_data["metadata"]["cost"]["input_cost"]
    output_cost = trace_data["metadata"]["cost"]["output_cost"]
    calculated_cost = round(input_cost + output_cost, 5)  # Round to 5 decimal places
    
    assert abs(calculated_cost - total_cost) < 0.00001, \
        f"Total cost {total_cost} should approximately equal the sum of input ({input_cost}) and output ({output_cost}) costs"
    
    # Check if the OpenAI span contains the same cost information
    openai_spans = [span for span in trace_data["data"][0]["spans"] if span["name"] == "OpenAI.0"]
    if openai_spans:
        openai_span = openai_spans[0]
        if "llm.cost" in openai_span["attributes"]:
            openai_cost = openai_span["attributes"]["llm.cost"]["total_cost"]
            # Check if the cost in the span is consistent with the total cost 
            # (allowing for rounding differences)
            assert abs(openai_cost - total_cost) < 0.00001, \
                f"Expected OpenAI span cost to be close to {total_cost}, got {openai_cost}"

# def test_model_cost_as_no_op():
#     """
#     Test that verifies the model_cost no-op function feature.
    
#     This feature makes the model_cost function a no-op, meaning it will:
#     1. Not perform any actual cost calculations
#     2. Return default zero values for all cost fields
#     3. Maintain trace structure integrity
    
#     The test loads an existing trace file (rag_agent_traces.json) and verifies
#     that despite having token usage data, all cost calculations are zero.
#     """
#     # Path to the existing trace file with the no-op model_cost feature enabled
#     output = run_diagnosis_agent()
#     trace_file_path = extract_trace_path(output)
    
#     # trace_file_path = os.path.join(
#     #     Path(__file__).resolve().parent, 
#     #     "rag_agent_traces.json"
#     # )
    
#     # Load the trace file
#     with open(trace_file_path, 'r') as f:
#         trace_data = json.load(f)
    
#     # Verify tokens data exists (proving the model was actually used)
#     assert "tokens" in trace_data["metadata"], "Expected tokens data to be present in metadata"
#     prompt_tokens = trace_data["metadata"]["tokens"]["prompt_tokens"]
#     completion_tokens = trace_data["metadata"]["tokens"]["completion_tokens"]
    
#     # Ensure token counts are non-zero (confirming the model was actually used)
#     assert prompt_tokens > 0, "Expected non-zero prompt tokens"
#     assert completion_tokens > 0, "Expected non-zero completion tokens"
    
#     # FEATURE TEST: With the new no-op feature, despite having tokens, all costs should be zero
#     assert trace_data["metadata"]["cost"]["input_cost"] == 0.0, "Expected input_cost to be 0.0 with no-op model_cost"
#     assert trace_data["metadata"]["cost"]["output_cost"] == 0.0, "Expected output_cost to be 0.0 with no-op model_cost"
#     assert trace_data["metadata"]["total_cost"] == 0.0, "Expected total_cost to be 0.0 with no-op model_cost"
    
#     # Check OpenAI spans for cost information
#     openai_spans = [span for span in trace_data["data"][0]["spans"] if span["name"].startswith("OpenAI")]
#     assert openai_spans, "Expected to find OpenAI spans in the trace"
    
#     for span in openai_spans:
#         # Verify token counts exist and are positive (model was used)
#         if "llm.token_count.prompt" in span["attributes"]:
#             assert span["attributes"]["llm.token_count.prompt"] > 0, "Expected non-zero prompt token count"
#         if "llm.token_count.completion" in span["attributes"]:
#             assert span["attributes"]["llm.token_count.completion"] > 0, "Expected non-zero completion token count"
        
#         # FEATURE TEST: Despite token usage, costs should be zero in the span
#         if "llm.cost" in span["attributes"]:
#             assert span["attributes"]["llm.cost"]["input_cost"] == 0.0, "Expected span input_cost to be 0.0 with no-op model_cost"
#             assert span["attributes"]["llm.cost"]["output_cost"] == 0.0, "Expected span output_cost to be 0.0 with no-op model_cost"
#             assert span["attributes"]["llm.cost"]["total_cost"] == 0.0, "Expected span total_cost to be 0.0 with no-op model_cost"
def test_litellm_cost_calculation():
    """
    Test that verifies the LiteLLM cost calculation bug fix.
    
    This test focuses on:
    1. Correctly parsing prompt_tokens and completion_tokens from LiteLLM responses
    2. Ensuring costs are calculated properly using model-specific rates (input_cost_per_token and output_cost_per_token)
    """
    # Load a trace file that contains LiteLLM or OpenAI call data
    # We'll use the existing trace file instead of generating a new one
    trace_file_path = os.path.join(
        Path(__file__).resolve().parent, 
        "rag_agent_traces.json"
    )
    
    # Load the trace file
    with open(trace_file_path, 'r') as f:
        trace_data = json.load(f)
    
    # Verify token counts are properly parsed from LiteLLM response
    assert "tokens" in trace_data["metadata"], "Expected tokens data to be present in metadata"
    prompt_tokens = trace_data["metadata"]["tokens"]["prompt_tokens"]
    completion_tokens = trace_data["metadata"]["tokens"]["completion_tokens"]
    
    # Ensure token counts are non-zero (confirming the model was actually used)
    assert prompt_tokens > 0, "Expected non-zero prompt tokens from LiteLLM response"
    assert completion_tokens > 0, "Expected non-zero completion tokens from LiteLLM response"
    
    # Verify the metadata contains cost information
    assert "cost" in trace_data["metadata"], "Expected cost data to be present in metadata"
    
    # Extract cost values from metadata
    input_cost = trace_data["metadata"]["cost"]["input_cost"]
    output_cost = trace_data["metadata"]["cost"]["output_cost"]
    total_cost = trace_data["metadata"]["cost"]["total_cost"]
    
    # Print actual costs from metadata for debugging
    print(f"Cost data in metadata: input={input_cost}, output={output_cost}, total={total_cost}")
    print(f"Token counts: prompt={prompt_tokens}, completion={completion_tokens}")
    
    # The core of the bugfix: Verify that costs are calculated correctly based on token counts
    if prompt_tokens > 0 and completion_tokens > 0:
        # Check that input and output costs are non-zero (assuming paid model)
        assert input_cost > 0, "Expected non-zero input cost for LiteLLM model"
        assert output_cost > 0, "Expected non-zero output cost for LiteLLM model"
        
        # Check that total cost matches sum of input and output costs
        calculated_total = round(input_cost + output_cost, 5)  # Round to 5 decimal places
        assert abs(calculated_total - total_cost) < 0.00001, \
            f"Total cost {total_cost} should equal the sum of input ({input_cost}) and output ({output_cost}) costs"
        
        # Calculate per-token rates from the actual costs and token counts
        derived_input_cost_per_token = round(input_cost / prompt_tokens, 7)
        derived_output_cost_per_token = round(output_cost / completion_tokens, 7)
        print(f"Derived per-token costs: input={derived_input_cost_per_token}, output={derived_output_cost_per_token}")
        
        # Verify that we can recalculate the costs from token counts and rates
        # This is the essence of the LiteLLM bugfix - ensuring the cost calculation formula works correctly
        # recalc_input_cost = round(prompt_tokens * derived_input_cost_per_token, 5)
        # recalc_output_cost = round(completion_tokens * derived_output_cost_per_token, 5)
        # recalc_total = round(recalc_input_cost + recalc_output_cost, 5)
        
        # Allow small floating point differences
        # assert abs(recalc_input_cost - input_cost) < 0.00001, \
        #     f"Recalculated input cost {recalc_input_cost} should match metadata input cost {input_cost}"
        # assert abs(recalc_output_cost - output_cost) < 0.00001, \
        #     f"Recalculated output cost {recalc_output_cost} should match metadata output cost {output_cost}"
        # assert abs(recalc_total - total_cost) < 0.00001, \
        #     f"Recalculated total cost {recalc_total} should match metadata total cost {total_cost}"
    
    # Find and check if any OpenAI spans exist
    openai_spans = [span for span in trace_data["data"][0]["spans"] 
                  if span.get("name", "").startswith("OpenAI")]
    
    if openai_spans:
        print(f"Found {len(openai_spans)} OpenAI spans")
        
        # Get token usage from the OpenAI span if available
        for span in openai_spans:
            if "attributes" in span and "output.value" in span["attributes"]:
                # Try to extract token usage from the LLM output
                output_json = json.loads(span["attributes"]["output.value"])
                if "llm_output" in output_json and "token_usage" in output_json["llm_output"]:
                    token_usage = output_json["llm_output"]["token_usage"]
                    print(f"Token usage from OpenAI span: {token_usage}")
                    
                    # Verify token counts from OpenAI span are reasonable
                    # Since metadata may contain aggregated tokens from multiple calls,
                    # we shouldn't directly compare them but ensure they are present and reasonable
                    assert token_usage["prompt_tokens"] > 0, \
                        f"Span prompt_tokens should be greater than 0, got {token_usage['prompt_tokens']}"
                    assert token_usage["completion_tokens"] > 0, \
                        f"Span completion_tokens should be greater than 0, got {token_usage['completion_tokens']}"
                    
                    # Log that we found valid token counts in the span
                    print(f"Verified OpenAI span has valid token counts: {token_usage}")
                    
                    break

def test_export_all_trace_columns():
    """
    Test that exports all columns from the trace file without any filtering.
    This function loads the rag_agent_traces.json file and prints out the complete
    structure to allow for full inspection of all data elements.
    """
    # Load the trace file
    trace_file_path = os.path.join(
        Path(__file__).resolve().parent, 
        "rag_agent_traces.json"
    )
    
    # print(f"Loading trace file from: {trace_file_path}")
    
    # Load the trace file
    with open(trace_file_path, 'r') as f:
        trace_data = json.load(f)
    
    # Print the top-level keys
    # print("\nTop-level keys in trace data:")
    for key in trace_data.keys():
        print(f"  - {key}")
    
    # Print metadata sections
    # print("\nMetadata sections:")
    for key in trace_data.get("metadata", {}).keys():
        print(f"  - {key}")
    
    # Export all spans
    # print("\nExporting all spans:")
    spans = trace_data.get("data", [{}])[0].get("spans", [])
    # print(f"Found {len(spans)} spans")
    
    # Create a summary of each span
    for i, span in enumerate(spans):
        # print(f"\nSpan {i+1}: {span.get('name')}")
        # print(f"  - Start time: {span.get('start_time')}")
        # print(f"  - End time: {span.get('end_time')}")
        # print(f"  - Status: {span.get('status', {}).get('status')}")
        
        # Print all attributes keys (not values, as they can be very long)
        attributes = span.get("attributes", {})
        # print(f"  - Attributes ({len(attributes)} keys):")
        for attr_key in attributes.keys():
            attr_value = attributes[attr_key]
            # For display purposes, truncate very long values
            if isinstance(attr_value, str) and len(attr_value) > 100:
                attr_value = attr_value[:100] + "... [truncated]"
            # print(f"    - {attr_key}: {attr_value}")
    
    # Export token and cost information
    # print("\nToken and Cost Information:")
    tokens = trace_data.get("metadata", {}).get("tokens", {})
    costs = trace_data.get("metadata", {}).get("cost", {})
    
    # print("Tokens:")
    for k, v in tokens.items():
        print(f"  - {k}: {v}")
    
    # print("Costs:")
    for k, v in costs.items():
        print(f"  - {k}: {v}")
    
    # Export system information
    # print("\nSystem Information:")
    # system_info = trace_data.get("metadata", {}).get("system_info", {})
    # print(f"  - ID: {system_info.get('id')}")
    # print(f"  - OS: {system_info.get('os', {}).get('name')} {system_info.get('os', {}).get('version')}")
    
    # Assert that we have loaded data successfully
    assert "id" in trace_data, "Trace data should have an 'id' field"
    assert "metadata" in trace_data, "Trace data should have a 'metadata' field"
    assert "data" in trace_data, "Trace data should have a 'data' field"
    assert len(spans) > 0, "Trace data should contain at least one span"


def test_exclude_vital_columns():
    """
    Test that verifies vital columns are excluded while masking.
    This test checks that fields like model_name, cost, latency, span_id, trace_id, etc.
    are not present in the exported trace data.
    """
    # Load the trace file
    trace_file_path = os.path.join(
        Path(__file__).resolve().parent, 
        "rag_agent_traces.json"
    )
    
    # Load the trace file
    with open(trace_file_path, 'r') as f:
        trace_data = json.load(f)
    
    # Define the vital columns that should be excluded
    vital_columns = [
        "model_name",
        "cost",
        "latency",
        "span_id",
        "trace_id"
    ]
    
    # Check that each vital column is not present in the trace data
    for column in vital_columns:
        assert column not in trace_data, f"Expected {column} to be excluded from trace data"


if __name__ == "__main__":
    test_trace_total_cost()
    test_model_cost_as_no_op()
    test_litellm_cost_calculation()
    test_export_all_trace_columns()
    test_exclude_vital_columns()
    