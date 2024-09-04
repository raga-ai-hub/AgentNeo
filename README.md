# AgentNeo

## To install the package
```bash
pip install agentneo -U
```

## Authentication
Creates an authenticated session with AgentNeo
```python
from agentneo import AgentNeo
```

## To authenticate
```python
# To autheticate if you have access to RAGAAI AgentNeo ACCESS_KEY & SECRET_KEY
agent_session = AgentNeo(
    access_key=ACCESS_KEY,
    secret_key=SECRET_KEY,
    base_url=BASE_URL # "http://74.249.60.46:5000"
)
```

```py
# To autheticate using email-id, creates new account if is not a user else retrieves the existing account
agent_session = AgentNeo(email="your.mailid@domain.com", base_url=BASE_URL)
```

## Project Management
Allows listing and creating projects
```python
from agentneo import Project

# To create a new project
project = Project(session=agent_session, 
                  project_name="project_name", 
                  description="Project Description").create()
project_id = project['id']
```

## Trace Management
Enables tracing of agents, methods, and LangGraph graphs
```python
from agentneo import Trace

# Create a tracer object
tracer = Tracer(session=agent_session, metadata={
                tools= [
                    {"name": "name1", "description": "tool_description1"},
                    {"name": "name2", "description": "tool_description2"},
                    ...
                ])

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

## Dataset Management
Allows creation and management of datasets
```python
from agentneo import Dataset

# To define a new dataset
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
Allows creation, execution, and analysis of experiments
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
    print(f"{'*'*100}\n")
```
