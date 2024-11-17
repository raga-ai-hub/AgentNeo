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

### 5. RAGChecker Evaluation
Evaluates the RAG using the RAGChecker.

```python
exe.evaluate(metric_list=['ragchecker_evaluation'])
```

**Configuration Options:**
```python
config = {
    "input_file": "path/to/file.txt",   # Path to the input file
    "metric_type": "all",               # Type of metric to evaluate (all, reteriver, generator)
    "model": "gpt-4o-mini",             # Model to use for RAGChecker
    "checker_name": "gpt-4o-mini",      # Name of the checker model
    "api_key": None,                    # litellm API key
    "extractor_max_new_tokens": 1000,
    "extractor_api_base": None,
    "checker_api_base": None,
    "batch_size_extractor": 32,
    "batch_size_checker": 32,
    "openai_api_key": None,             # Direct API key for OpenAI
    "joint_check": True,
    "joint_check_num": 5
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
        'tool_call_success_rate'
    ]
)
```