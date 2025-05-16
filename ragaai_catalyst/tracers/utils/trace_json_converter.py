import json
import logging
import sys
import uuid
from datetime import datetime
from typing import Any, Dict, List

import pytz

from ragaai_catalyst.tracers.agentic_tracing.utils.llm_utils import (
    calculate_llm_cost,
    count_tokens,
    get_model_cost,
)

logger = logging.getLogger(__name__)

def convert_time_format(original_time_str, target_timezone_str="Asia/Kolkata"):
    """
    Converts a UTC time string to a specified timezone format.

    Args:
        original_time_str (str): The original time string in UTC format (e.g., "2025-02-28T22:05:57.945146Z").
        target_timezone_str (str): The target timezone to convert the time to (default is "Asia/Kolkata").

    Returns:
        str: The converted time string in the specified timezone format.
    """
    # Parse the original time string into a datetime object
    utc_time = datetime.strptime(original_time_str, "%Y-%m-%dT%H:%M:%S.%fZ")
    # Set the timezone to UTC
    utc_time = utc_time.replace(tzinfo=pytz.UTC)
    # Convert the UTC time to the target timezone
    target_timezone = pytz.timezone(target_timezone_str)
    target_time = utc_time.astimezone(target_timezone)
    # Format the datetime object to the desired string format
    formatted_time = target_time.strftime("%Y-%m-%dT%H:%M:%S.%f%z")
    # Add a colon in the timezone offset for better readability
    formatted_time = formatted_time[:-2] + ':' + formatted_time[-2:]
    return formatted_time


def get_uuid(name):
    """Generate a random UUID (not based on name)."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, name))

def get_ordered_family(parent_children_mapping: Dict[str, Any]) -> List[str]:
    def ordering_function(parent_id: str, ordered_family: List[str]):
        children = parent_children_mapping.get(parent_id, [])
        parent_child_ids =[child['id'] for child in children if child['id'] in parent_children_mapping]
        for child_id in parent_child_ids:
            if child_id not in ordered_family:
                ordered_family.append(child_id)
                ordering_function(child_id, ordered_family)
    ordered_family = [None]
    ordering_function(None, ordered_family)
    return reversed(ordered_family)

def get_spans(input_trace):
    data = input_trace.copy()
    from collections import defaultdict
        
    name_counts = defaultdict(int)

    for span in data:
        # 1. For each span add '.{occurence_no}' to the span name, where occurence_no is the number of times the span name has occurred
        span["name_occurrences"] = name_counts[span["name"]]
        name_counts[span["name"]] += 1
        span['name'] = f"{span['name']}.{span['name_occurrences']}"

        # 2. For each span add hash_id, which is uuid4 based on the span name
        span['hash_id'] = get_uuid(span['name'])
    return data

def convert_json_format(input_trace, custom_model_cost, user_context, user_gt,external_id):
    """
    Converts a JSON from one format to UI format, handling nested spans.

    Args:
        input_trace (str): The input JSON string.

    Returns:
        final_trace: The converted JSON, or None if an error occurs.
    """
    final_trace = {
        "id": input_trace[0]["context"]["trace_id"],
        "trace_name": "",  
        "project_name": "",  
        "start_time": convert_time_format(min(item["start_time"] for item in input_trace)),
        "end_time": convert_time_format(max(item["end_time"] for item in input_trace)),
        "external_id": external_id
    }
    final_trace["metadata"] = {
        "tokens": {
            "prompt_tokens": 0.0,
            "completion_tokens": 0.0,
            "total_tokens": 0.0
        },
        "cost": {
            "input_cost": 0.0,
            "output_cost": 0.0,
            "total_cost": 0.0
        }    
    }
    final_trace["replays"] = {"source": None}
    final_trace["data"] = [{}]
    final_trace["network_calls"] = []
    final_trace["interactions"] = []

    # Extract and attach spans
    try:
        spans = get_spans(input_trace)
        # Add user passed context to the trace
        try:
            if user_context:
                spans.append(custom_spans(user_context, "Context", input_trace[0]["context"]["trace_id"], spans[0].get("parent_id")))
        except Exception as e:
            print(f"Error in adding context: {e}")
            return None
        
        try:
            if user_gt:
                spans.append(custom_spans(user_gt, "GroundTruth", input_trace[0]["context"]["trace_id"], spans[0].get("parent_id")))
        except Exception as e:
            print(f"Error in adding ground truth: {e}")
            return None


        final_trace["data"][0]["spans"] = spans
        
        # Calculate token counts and costs from spans
        for span in spans:
            if "attributes" in span:
                # Extract token counts
                prompt_tokens = span["attributes"].get("llm.token_count.prompt", 0)
                completion_tokens = span["attributes"].get("llm.token_count.completion", 0)

                # If prompt tokens or/and completion tokens are not present, will calculate it using tiktoken
                try:
                    if prompt_tokens == 0:
                        prompt_value = span["attributes"].get("input.value")
                        if prompt_value:
                            prompt_tokens = count_tokens(prompt_value)
                            logger.debug(f"Prompt tokens not present, calculated it: {prompt_tokens}")
                    if completion_tokens == 0:
                        completion_value = span["attributes"].get("output.value")
                        if completion_value:
                            completion_tokens = count_tokens(completion_value)
                            logger.debug(f"Completion tokens not present, calculated it: {completion_tokens}")
                except Exception as e:
                    logger.warning(f"Failed to calculate token counts: {e}")

                # Update token counts
                final_trace["metadata"]["tokens"]["prompt_tokens"] += prompt_tokens
                final_trace["metadata"]["tokens"]["completion_tokens"] += completion_tokens
                final_trace["metadata"]["tokens"]["total_tokens"] += prompt_tokens + completion_tokens

                # Get model name from the last span
                model_name = span["attributes"].get("llm.model_name", "")
                if model_name:
                    try:
                        model_costs = get_model_cost()
                        span_cost = calculate_llm_cost(
                            {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens, "total_tokens": prompt_tokens + completion_tokens},
                            model_name,
                            model_costs,
                            custom_model_cost
                        )
                        final_trace["metadata"]["cost"]["input_cost"] += span_cost["input_cost"]
                        final_trace["metadata"]["cost"]["output_cost"] += span_cost["output_cost"]
                        final_trace["metadata"]["cost"]["total_cost"] += span_cost["total_cost"]
                        
                        # Add cost to span attributes for debugging
                        span["attributes"]["llm.cost"] = span_cost
                    except Exception as e:
                        logger.warning(f"Failed to calculate span cost: {e}")

    except Exception as e:
        raise Exception(f"Error in get_spans function: {e}")

    # Total metadata summary
    final_trace["metadata"]["total_cost"] = final_trace["metadata"]["cost"]["total_cost"]
    final_trace["metadata"]["total_tokens"] = final_trace["metadata"]["tokens"]["total_tokens"]

    return final_trace

def custom_spans(text, span_type, trace_id, parent_id):
    try: 
        return {
        "name": f"Custom{span_type}Span",
        "context": {
            "trace_id": trace_id,
            "span_id": f"0x{uuid.uuid4().hex[:16]}",
            "trace_state": "[]"
          },
        "kind": "SpanKind.INTERNAL",
        "parent_id": parent_id,
        "start_time": convert_time_format(datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")),
        "end_time": convert_time_format(datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")),
        "status": {
            "status_code": "OK"
          },
        "attributes": {
            "input.value": text,
            "openinference.span.kind": "UNKNOWN"
        },
        "events": [],
        "name_occurrences": 0,
        "hash_id": get_uuid(f"Custom{span_type}Span")
    }
    except Exception as e:
        logger.warning(f"Error in custom_spans function: {e}")
        return {
        "name": f"Custom{span_type}Span",
        "context": {
            "trace_id": trace_id,
            "span_id": f"0x{uuid.uuid4().hex[:16]}",
            "trace_state": "[]"
          },
        "kind": "SpanKind.INTERNAL",
        "parent_id": parent_id,
        "start_time": convert_time_format(datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")),
        "end_time": convert_time_format(datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")),
        "status": {
            "status_code": "ERROR",
            "description": str(e)
          },
        "attributes": {
            "input.value": text,
            "openinference.span.kind": "UNKNOWN"
        },
        "events": [],
        "name_occurrences": 0,
        "hash_id": get_uuid(f"Custom{span_type}Span")
    }

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert.py <input_openinference_trace_path> <output_trace_path>")
        print("Example: python convert.py sample_openinference_trace/test.json output.json")
        sys.exit(1)
    input_file_path = sys.argv[1]
    output_file_path = sys.argv[2]
    with open(input_file_path,'r') as fin:
        input_trace=[]
        for line in fin:
            data=json.loads(line)
            input_trace.append(data)
        payload = convert_json_format(input_trace)
        print(payload)
        with open(output_file_path,"w") as fout:
            json.dump(payload,fout)
            fout.write("\n")
