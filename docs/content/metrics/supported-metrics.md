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
Evaluates the RAG using the RAGAS.

```python
exe.evaluate(metric_list=['ragas_evaluation'],config=config)
```

**Configuration Options:**
```python
config = {
    "input_file": "path/to/file.json",   # Path to the input file
    "metrics": [
            "context_precision",
            "context_recall",
            "faithfulness",
            "answer_relevancy",
            "context_entity_recall",
        ]
    "model": "gpt-4o-mini",                     # Model to use for RAGAS (Only openai models are supported)
    "embeddings": "text-embedding-3-small",     # Embeddings to use for RAGAS (only openai embeddings are supported)
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