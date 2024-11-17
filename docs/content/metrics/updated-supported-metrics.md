# Supported Metrics

AgentNeo now supports multiple metric calculation in a single call with custom configuration for each metrics in parallel manner.

Evaluation function now takes two arguments `max_eval_workers` and `max_metric_workers` which represents the maximum number of parallel evaluations and maximum number of parallel metrics per evaluation

```python
evaluations = [
    {
        "metric_list":[
        'goal_decomposition_efficiency',
        'goal_fulfillment_rate',
        'tool_call_correctness_rate',
        'tool_call_success_rate'
        ],
        "config":{
        "model": "gpt-4o-mini"
        }
    }
]

# Only one evaluation at time
exe.evaluate(evaluations=evaluations, max_metric_workers=1)
# Output time
# INFO:agentneo.evaluation.evaluation:Total Execution Time: 22.59 seconds

# Around 4 evaluation at time
exe.evaluate(evaluations=evaluations, max_metric_workers=4)
# Output time
# INFO:agentneo.evaluation.evaluation:Total Execution Time: 6.73 seconds
```

## Core Metrics

### 1. Goal Decomposition Efficiency

Measures how effectively an agent breaks down complex tasks.

```python
exe.evaluate(
    evaluations=[
        {
            "metric_list": ["goal_decomposition_efficiency"]
        }
    ]
)
```

**Configuration Options:**

```python
config = {
    "model": "gpt-4o-mini",
}
```

### 2. Goal Fulfillment Rate

Assesses the success rate of achieving defined objectives.

```python
exe.evaluate(
    evaluations=[
        {
            "metric_list": ["goal_fulfillment_rate"]
        }
    ]
)
```

**Configuration Options:**

```python
config = {
    "model": "gpt-4o-mini",
}
```

### 3. Tool Call Correctness Rate

Evaluates the accuracy of tool usage.

```python
exe.evaluate(
    evaluations=[
        {
            "metric_list": ["tool_call_correctness_rate"]
        }
    ]
)
```

**Metadata Example:**

```python
metadata = {
    "tools": [
        {
            "name": "calculator",
            "expected_usage": ["multiplication", "division"]
        }
    ]
}
```

### 4. Tool Call Success Rate

Measures the reliability of tool executions.

```python
exe.evaluate(
    evaluations=[
        {
            "metric_list": ["tool_call_success_rate"]
        }
    ]
)
```

## Using Multiple Metrics

```python
# Evaluate multiple metrics together along with custom config
exe.evaluate(
    evaluations = [
    {
        "metric_list":[
        'goal_decomposition_efficiency',
        'goal_fulfillment_rate',
        'tool_call_correctness_rate',
        'tool_call_success_rate'
        ]
    }
]
)
```
