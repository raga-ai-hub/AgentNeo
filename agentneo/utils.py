from typing import Dict, Any, Optional
from dataclasses import dataclass, field, asdict
import json 


def calculate_cost(token_usage: Dict[str, int],
                input_cost_per_token: float,
                completion_cost_per_token: float,
                reasoning_cost_per_token: float=0) -> Dict[str, float]:

        cost = {
            'input': token_usage['input']*input_cost_per_token,
            'completion': token_usage['completion']*completion_cost_per_token,
            'reasoning': token_usage['reasoning']*reasoning_cost_per_token
        }
        return cost

def log_event(event_data, log_file_path):
    event_data = asdict(event_data)
    with open(log_file_path, 'a') as f:
        f.write(json.dumps(event_data) + '\n')

def convert_usage_to_dict(token_usage):
    return {
        'input': token_usage.prompt_tokens,
        'completion': token_usage.completion_tokens,
        'reasoning': 0 #TODO:#token_usage.completion_tokens_details
    }