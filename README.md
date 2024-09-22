
# AgentNeo

[![Example Notebook](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1m_zfLYZaamIvK6hENyr4FWMJMjfZgkv7?usp=sharing)

AgentNEO is an AI-driven project management and experimentation tool that allows users to create, manage, and track the performance of AI agents. It provides comprehensive features for project management, dataset creation, agent tracing, and running experiments with various metrics, all within a seamless and scalable environment.

## Table of Contents
- [Introduction](#introduction)
- [Installation](#installation)
- [Authentication](#authentication)
- [Project Management](#project-management)
- [Trace Management](#trace-management)
- [Dataset Management](#dataset-management)
- [Experiment Management](#experiment-management)
- [Metrics Execution](#metrics-execution)
- [Serialization and Callbacks](#serialization-and-callbacks)
- [Examples](#additional-examples)
- [Support](#support)

## Introduction
AgentNEO provides a streamlined environment to organize AI-driven projects, trace experiment results, and evaluate performance with various metrics. It is ideal for AI engineers and data scientists managing multiple agents, datasets, and experiments.

## Installation
To install AgentNEO, you can use pip:
```bash
pip install agentneo -U
```

### Prerequisites
You will need the following dependencies installed:
- `requests`: For making HTTP requests to the API.
- `jsonschema`: For validating JSON payloads.
- `uuid`: For handling unique identifiers.
- `os`: For environment variable management.
- `openai`: For using OpenAI models.

Ensure you set the following environment variables:
- `ACCESS_KEY`: Your AgentNEO access key.
- `SECRET_KEY`: Your AgentNEO secret key.
- `OPENAI_API_KEY`: Your OpenAI API key for experiment metrics.

## Authentication

### Using ACCESS_KEY and SECRET_KEY
To authenticate with AgentNeo, you can use your RAGAAI AgentNeo `ACCESS_KEY` and `SECRET_KEY`:
```python
from agentneo import AgentNeo

agent_session = AgentNeo(
    access_key=ACCESS_KEY,
    secret_key=SECRET_KEY,
    base_url=BASE_URL # Example: "http://74.249.60.46:5000"
)
```

### Using Email
Alternatively, you can authenticate with an email ID. A new account will be created if you are not already a user, otherwise, the existing account is retrieved:
```python
agent_session = AgentNeo(email="your.mailid@domain.com", base_url=BASE_URL)
```

## Project Management
The project management module helps you organize AI agents, datasets, and experiments within structured projects.

### Creating a Project
```python
from agentneo import Project

project = Project(
    session=agent_session, 
    project_name="project_name", 
    description="Project Description"
)
project_id = project['id']
```

## Trace Management
Trace management enables logging and tracking of interactions between agents, datasets, and tools during experiments.

### Creating a Tracer
```python
from agentneo import Trace

# Create a tracer object
tracer = Tracer(session=agent_session, metadata={
                tools= [
                    {"name": "name1", "description": "tool_description1"},
                    {"name": "name2", "description": "tool_description2"}
                ]})

# Decorator to trace agents & methods
@tracer.trace_node

# Decorator to trace Langgraph graphs
@tracer.trace_graph

# To add callbacks to LLMs
openai_llm = ChatOpenAI(other_parameters, 
                        ... , 
                        callbacks=[tracer.get_callback_handler()])
                        
# To upload the recorded traces
trace_id = tracer.upload_trace()
```

The tracer will create logs for LLM events and console events, and these logs will be stored in `.tracer_logs`.

## Dataset Management
Datasets are key elements used to train and evaluate your agents.

### Creating a Dataset
```python
from agentneo import Dataset

dataset = Dataset(
    session=agent_session,
    project_id=project_id,
    dataset_name="test_dataset1",
    description="A test dataset"
)

# Create dataset from recorded trace
dataset_traced = dataset.from_trace(trace_id=tracer.id, trace_filter=None)
```

## Experiment Management
Experiments allow you to measure agent performance with specific metrics.

### Creating and Running an Experiment
```python
from agentneo import Experiment

# Create a new experiment 
experiment_object = Experiment(
        session=agent_session,
        experiment_name="ExperimentName",
        description="Sample Description",
        dataset_id=dataset_traced['id'],
        project_id=project_id
    )

experiment_created = experiment_object.create()

# To run a metric
exp = experiment.execute(metrics=[
    {
            "name": "tool_selection_accuracy", 
            "config": {
                    "model": "gpt-4o-mini", 
                    "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY")
            }
    }
])

# To run multiple metrics together
exp = experiment.execute(metrics=[
    {
            "name": "summarise", 
            "config": {}
    },
    {
            "name": "tool_selection_accuracy", 
            "config": {
                    "model": "gpt-4o-mini", 
                    "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY")
            }
    },
    {
            "name": "tool_usage_efficiency", 
            "config": {
                    "model": "gpt-4o-mini", 
                    "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY")
            }
    },
    {
            "name": "goal_decomposition_efficiency", 
            "config": {
                    "model": "gpt-4o-mini", 
                    "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY")
            }
    },
    {
            "name": "plan_adaptibility", 
            "config": {
                    "model": "gpt-4o-mini", 
                    "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY")
            }
    }
])

# To get the results of the experiments run
exp = experiment.get_results(experiment_id=exp.id)

for i in exp['results']:
    print(f"Name: {i['metric_name']}")
    print(f"Result:")
    for key, value in i['result'].items():
        print(f"{key}: {value}")
    print(f"{'*'*100}
")
```

## Serialization and Callbacks
AgentNeo uses `UUIDEncoder` for serializing UUID objects, which allows complex objects like `AgentNeo` sessions to be converted into JSON.

Additionally, `NeoCallbackHandler` can be used for logging LLM events, enabling detailed tracking of AI agents’ performance during experiments.

### Example Callback
```python
from agentneo import Tracer

neo_tracer = Tracer.init(session=agent_session, trace_llms=True)

callback_handler = NeoCallbackHandler(neo_tracer)
```

This will log the start and end of LLM events, recording latency, token usage, and model performance.

### Error Handling
The `Tracer` class includes error handling for issues during serialization. Errors are captured and stored, allowing users to diagnose issues in logs. Logs can be found in `.tracer_logs`.

## Additional Examples
For more detailed examples and use cases, visit [examples](https://github.com/raga-ai-hub/agentneo/tree/main/examples).

## Support
If you encounter any issues, feel free to raise them via [issues on GitHub](https://github.com/raga-ai-hub/agentneo/issues).
