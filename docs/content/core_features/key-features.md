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

## Security Features

### Advanced Jailbreak Detection
Comprehensive multi-layered system to detect and prevent LLM security bypass attempts:

1. Pattern-Based Analysis

- Regular expression pattern matching
- Keyword detection system
- Contextual pattern analysis
- Suspicious behavior identification

```python
from agentneo.utils.security_utils import IntegratedJailbreakDetector

def analyze_patterns(text):
    detector = IntegratedJailbreakDetector()
    matches = detector.pattern_match(text)
    return {
        "matches": matches,
        "has_suspicious_patterns": len(matches) > 0
    }

analyze_patterns("<INSERT Your Text here>")
```  

2. LLM-Based Analysis

- Deep content evaluation
- Context manipulation detection
- Social engineering identification
- Multi-step attack detection

```python
from agentneo.utils.security_utils import IntegratedJailbreakDetector

def analyze_with_llm(text, pattern_matches=None):
    detector = IntegratedJailbreakDetector()
    analyse_results = detector.llm_analyze(
        model="llama-3.1-70b-versatile",
        text=text,
        pattern_matches=pattern_matches,
        response_format="json_object"
    )

    return analyse_results

analyze_with_llm(text)
```

3. Integrated Analysis Pipeline

- Combined pattern and LLM analysis
- Risk scoring system
- Confidence metrics
- Detailed verdict generation

```python
from agentneo.utils.security_utils import IntegratedJailbreakDetector

def detect_jailbreak(content):
    detector = IntegratedJailbreakDetector()
    verdict = detector.analyze(content)
    
    if verdict:
        raise SecurityException("Jailbreak attempt detected")
    return verdict

detect_jailbreak(content)
```

### Security Metrics & Logging

- Detailed analysis logging
- Pattern match tracking
- LLM analysis results
- Risk level assessment
- Confidence scoring