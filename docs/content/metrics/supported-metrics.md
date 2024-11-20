# Supported Metrics

## Core Metrics

### 1. Goal Decomposition Efficiency
Measures how effectively an agent breaks down complex tasks.

```python
exe.evaluate(metric_list=['goal_decomposition_efficiency'])
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
exe.evaluate(metric_list=['goal_fulfillment_rate'])
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
exe.evaluate(metric_list=['tool_call_correctness_rate'])
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
exe.evaluate(metric_list=['tool_call_success_rate'])
```

### 5. Error Detection Rate
Measures the system's ability to detect and identify errors during execution.

```python
exe.evaluate(metric_list=['error_detection_rate'])
```

**Configuration Options:**
```python
config = {
    "model": "gpt-4o-mini",
}
```

## Using Multiple Metrics
```python
# Evaluate multiple metrics together
exe.evaluate(
    metric_list=[
        'goal_decomposition_efficiency',
        'goal_fulfillment_rate',
        'tool_call_correctness_rate',
        'tool_call_success_rate',
        'error_detection_rate
    ]
)
```