# Basic Usage

## Setting Up AgentNeo

```python
from agentneo import AgentNeo, Tracer

# Initialize
neo_session = AgentNeo(session_name="my_session")
neo_session.create_project(project_name="my_project")

# Start tracing
tracer = Tracer(session=neo_session)
tracer.start()
```

## Using Decorators

### LLM Tracing
```python
@tracer.trace_llm("text_generation")
async def generate_text(prompt):
    response = await llm.generate(prompt)
    return response

# Usage
text = await generate_text("Tell me a story")
```

### Tool Tracing
```python
@tracer.trace_tool("data_processor")
def process_data(data):
    # Processing logic
    return processed_data

# Usage
result = process_data(raw_data)
```

### Agent Tracing
```python
@tracer.trace_agent("task_agent")
def execute_task(input_data):
    # Agent logic
    return result

# Usage
output = execute_task(data)
```

## Dashboard Usage

### Launching
```python
from agentneo import launch_dashboard

# After your traces are complete
tracer.stop()
launch_dashboard(port=3000)
```

### Viewing Data
1. Open `http://localhost:3000`
2. Navigate through different views:
   - Execution flow
   - Metrics
   - Timeline
   - Analytics

## PII Masking

### Mask PII information
Mask Personal information such as Name, Email Adress etc

```python
from agentneo.utils.security_utils import PIIObfuscation
from presidio_anonymizer.entities import OperatorConfig

text = f"""
    Joel Robin. You can email me at joel.joel.joel@example.com or call me at +1-213-456-7890. My health insurance number is HIN123456789. 
    My medical record number is MRN-9876543210. My degree transcript access key is 5678-XYZ-1234-ABCD.
"""

obfuscator = PIIObfuscation()
print(obfuscator.detect_and_mask_pii_secrets(text))
```

### User defined PII Masking
Enables users to define there own Masking criterion

```python
from presidio_anonymizer.entities import OperatorConfig
from agentneo.utils.security_utils import PIIObfuscation

text = f"""
    Joel Robin. You can email me at joel.joel.joel@example.com or call me at +1-213-456-7890. My health insurance number is HIN123456789. 
    My medical record number is MRN-9876543210. My degree transcript access key is 5678-XYZ-1234-ABCD.
"""

entity = ["PERSON"] ## Mask only Personal Name
operator = {"PERSON": OperatorConfig("replace", {"new_value": "[NAME]"})}
obfuscator = PIIObfuscation()
print(obfuscator.detect_and_mask_pii_secrets(data=text, use_default=False,entities=entity,operators=operator))
```

### Mask Sensitive Information
Mask sensitive information such as password, API keys, secrets etc.

```python
from agentneo.utils.security_utils import PIIObfuscation
from presidio_anonymizer.entities import OperatorConfig

text = f"""
    Joel Robin. You can email me at joel.joel.joel@example.com or call me at +1-213-456-7890. My health insurance number is HIN123456789. 
    My medical record number is MRN-9876543210. My degree transcript access key is 5678-XYZ-1234-ABCD.
"""

obfuscator = PIIObfuscation()
## enable enable_advanced_pii_mask to True to mask password and other secrets
print(obfuscator.detect_and_mask_pii_secrets(data=text, enable_advanced_pii_mask=True))
```