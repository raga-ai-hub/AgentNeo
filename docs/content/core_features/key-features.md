# Key Features

## Tracing Capabilities

### LLM Call Tracing
Monitor and analyze LLM interactions with detailed metrics:
- Input/output tokens
- Response times
- Cost tracking
- Model parameters
- Prompt analysis

```python
@tracer.trace_llm("market_analysis")
async def analyze_market(data):
    response = await openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": f"Analyze this market data: {data}"}]
    )
    return response.choices[0].message.content
```

### Tool Tracing
Track tool usage and performance:
- Execution time
- Input/output validation
- Error rates
- Usage patterns

```python
@tracer.trace_tool("data_processor")
def process_market_data(raw_data):
    # Processing logic
    return processed_data
```

### Agent Tracing
Monitor agent behavior and decision-making:
- Task decomposition
- Tool selection
- Goal achievement
- Interaction patterns

```python
@tracer.trace_agent("trading_agent")
def execute_trade_strategy(market_conditions):
    # Trading logic
    return trade_decision
```

### Ollama API Support
- Tracing LLM calls made to the Ollama API
- Capturing input prompts and outputs
- Monitoring performance metrics and resource utilization

```python
@tracer.trace_llm_ollama(name="ollama_llm_call_test")
def ollama_call(prompt, model="llama3.2", stream=False):
    params = {
        "model": model,
        "prompt": prompt,
        "stream": stream
    }
    url = "http://localhost:11434/api/generate"
    response = requests.post(
        url=url,
        json=params
    )
    result = response.json()
    return result
```


## Monitoring Features

### Real-time Dashboard
- Live execution tracking
- Interactive visualizations
- Performance metrics
- Resource utilization

### Data Storage
- SQLite backend
- JSON log files
- Custom storage adapters
- Data export capabilities

### Analytics
- Token usage trends
- Cost analysis
- Performance bottlenecks
- Error patterns

## Evaluation Tools
- Goal decomposition efficiency
- Tool usage effectiveness
- Response quality metrics
- Cost optimization insights