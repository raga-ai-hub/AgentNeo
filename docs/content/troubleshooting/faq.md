# Frequently Asked Questions

## General Questions

### Q: What Python versions are supported?
A: AgentNeo supports Python 3.8 and above.

### Q: Can I use AgentNeo with any LLM provider?
A: Yes, AgentNeo supports various providers including OpenAI, Anthropic, and others through LiteLLM.

### Q: How do I update AgentNeo?
A: Use pip to update to the latest version:
```bash
pip install --upgrade agentneo
```

## Technical Questions

### Q: How do I save trace data for later analysis?
A: Trace data is automatically saved in the specified storage location:
```python
neo_session = AgentNeo(
    session_name="my_session",
    storage_path="./my_traces"  # Custom storage location
)
```

### Q: Can I export trace data?
A: Yes, you can export data in various formats:
```python
from agentneo import export_traces

export_traces(session_id="my_session", format="json")
```

### Q: How do I debug tracing issues?
A: Enable debug mode:
```python
neo_session = AgentNeo(
    session_name="my_session",
    debug=True
)
```

## Performance Questions

### Q: How much overhead does tracing add?
A: Tracing typically adds minimal overhead (<1ms per trace).

### Q: Can I disable certain types of traces?
A: Yes, you can configure trace levels:
```python
tracer = Tracer(
    session=neo_session,
    trace_level="minimal"  # or "full", "custom"
)
```

## Integration Questions

### Q: Can I use AgentNeo with FastAPI?
A: Yes, see the [Developer Guide](../developer-guide/advanced-usage.md) for FastAPI integration.

### Q: How do I integrate with existing logging systems?
A: AgentNeo can work alongside other logging systems:
```python
import logging
from agentneo import configure_logging

configure_logging(level=logging.INFO)
```

## Customization Questions

### Q: Can I create custom metrics?
A: Yes, see the [Metrics Guide](../metrics/supported-metrics.md#custom-metrics).

### Q: How do I customize the dashboard?
A: Dashboard customization options are available through configuration:
```python
launch_dashboard(
    port=3000,
    theme="dark",
    custom_views=True
)
```