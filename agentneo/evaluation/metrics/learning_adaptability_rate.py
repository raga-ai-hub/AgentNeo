import json
from typing import Dict, Any, List, Union, Optional
import litellm
import os

def extract_tool_changes(llm_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract instances where tools or workflows changed during execution.
    """
    changes = []
    previous_tools = set()
    
    for call in llm_calls:
        current_tools = set(tool.get('name') for tool in call.get('tools', []))
        
        if previous_tools and current_tools != previous_tools:
            changes.append({
                'timestamp': call.get('timestamp'),
                'added_tools': list(current_tools - previous_tools),
                'removed_tools': list(previous_tools - current_tools),
                'call_index': llm_calls.index(call)
            })
        
        previous_tools = current_tools
    
    return changes

def analyze_post_change_performance(
    llm_calls: List[Dict[str, Any]], 
    change_points: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Analyze performance after each change point.
    """
    performance_data = []
    
    for change in change_points:
        change_index = change['call_index']
        post_change_calls = llm_calls[change_index + 1:change_index + 5]  # Analyze next 5 calls
        
        successful_adaptations = 0
        total_attempts = len(post_change_calls)
        
        for call in post_change_calls:
            # Check if the call was successful based on error presence and output validity
            if not call.get('error') and call.get('output'):
                successful_adaptations += 1
        
        performance_data.append({
            'change': change,
            'successful_adaptations': successful_adaptations,
            'total_attempts': total_attempts
        })
    
    return performance_data

def evaluate_learning_adaptability(
    performance_data: List[Dict[str, Any]], 
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluate the learning adaptability based on performance data.
    """
    prompt = f"""
You are an expert AI system evaluator tasked with assessing the Learning Adaptability Rate of an AI agent.
Your task is to analyze how effectively the agent adapts to changes in its available tools and workflows.

Context:
The agent has undergone several changes in its available tools and workflows. After each change:
{json.dumps(performance_data, indent=2)}

Please evaluate:
1. How quickly the agent adapted to changes
2. The success rate of tasks immediately following changes
3. The consistency of adaptation across different changes
4. The overall learning adaptability pattern

Provide your evaluation in JSON format with:
- A score between 0.0 and 1.0
- A detailed explanation of the score
- Key observations about the adaptation pattern
- Recommendations for improvement

Remember that a score of 1.0 indicates perfect adaptation, while 0.0 indicates complete failure to adapt.
"""

    response = litellm.completion(
        model=config.get("model", "gpt-4o-mini"),
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        response_format={"type": "json_object"},
    )
    
    return json.loads(response.choices[0].message.content)

def calculate_overall_lar(performance_data: List[Dict[str, Any]]) -> float:
    """
    Calculate the overall Learning Adaptability Rate.
    
    Args:
        performance_data: List of dictionaries containing performance metrics after each change
        
    Returns:
        float: Overall Learning Adaptability Rate between 0 and 1
    """
    if not performance_data:
        return 0.0
        
    total_successful = sum(data['successful_adaptations'] for data in performance_data)
    total_attempts = sum(data['total_attempts'] for data in performance_data)
    
    # Calculate weighted LAR based on successful adaptations vs total attempts
    if total_attempts == 0:
        return 0.0
        
    # Apply exponential decay to give more weight to recent adaptations
    weighted_sum = 0
    weighted_total = 0
    
    for i, data in enumerate(performance_data):
        weight = 1.0 / (2 ** i)  # More recent changes have higher weights
        weighted_sum += data['successful_adaptations'] * weight
        weighted_total += data['total_attempts'] * weight
    
    return weighted_sum / weighted_total if weighted_total > 0 else 0.0

def execute_learning_adaptability_rate_metric(
    trace_json: Dict[str, Any], 
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Execute the Learning Adaptability Rate metric evaluation.
    """
    try:
        # Extract LLM calls from trace
        llm_calls = trace_json.get('llm_calls', [])
        
        if not llm_calls:
            return {
                "metric_name": "learning_adaptability_rate",
                "config": config,
                "result": {
                    "score": 0.0,
                    "reason": "No LLM calls found in the trace."
                }
            }
        
        # Identify points where tools or workflows changed
        change_points = extract_tool_changes(llm_calls)
        
        if not change_points:
            return {
                "metric_name": "learning_adaptability_rate",
                "config": config,
                "result": {
                    "score": 1.0,
                    "reason": "No tool changes detected - agent maintained consistent performance."
                }
            }
        
        # Analyze performance after each change
        performance_data = analyze_post_change_performance(llm_calls, change_points)
        
        # Calculate overall LAR
        overall_lar = calculate_overall_lar(performance_data)
        
        # Get detailed evaluation
        evaluation = evaluate_learning_adaptability(performance_data, config)
        
        return {
            "metric_name": "learning_adaptability_rate",
            "config": config,
            "result": {
                "score": overall_lar,
                "detailed_evaluation": evaluation,
                "change_points": change_points,
                "performance_data": performance_data
            }
        }
        
    except Exception as e:
        return {
            "metric_name": "learning_adaptability_rate",
            "config": config,
            "result": {
                "score": 0.0,
                "reason": f"Error executing metric: {str(e)}"
            }
        }