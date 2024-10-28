# Breaking Changes

## Version 1.2.0

### Evaluation Framework
- Renamed `Execution` class to `Evaluation`
- Updated metric computation methods

```python
# Old code (1.1.0)
from agentneo import Execution
exe = Execution(session=neo_session)

# New code (1.2.0)
from agentneo import Evaluation
eval = Evaluation(session=neo_session)
```

### Configuration Changes
- Modified dashboard configuration structure
- Updated storage backend options

## Version 1.1.0

### API Changes
- Restructured tracer initialization
- Modified event handling system

```python
# Old code (1.0.0)
tracer = Tracer()
tracer.init(session)

# New code (1.1.0)
tracer = Tracer(session=session)
```

### Storage Updates
- New SQLite schema
- Changed JSON log format

## Migration Guidelines
See [Migration Guide](migration-guide.md) for detailed upgrade instructions.