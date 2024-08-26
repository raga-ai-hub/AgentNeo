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
agent_session = AgentNeo(
    access_key=ACCESS_KEY,
    secret_key=SECRET_KEY,
    base_url=BASE_URL
)
```

## Project Management
Allows listing and creating projects
```python
from agentneo import Project

# To list the available projects
Project.list_projects(session=agent_session)

# To create a new project
project = Project(session=agent_session, 
                  project_name="project_name", 
                  description="Project Description").create()
```

## Trace Management
Enables tracing of agents, methods, and LangGraph graphs
```python
from agentneo import Trace

# Create a tracer object
tracer = Tracer(session=agent_session)

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

# To list the available Datasets
Dataset.list_datasets(session=agent_session)

# To define a new dataset
dataset = Dataset(
    session=agent_session,
    project_id=project_id, 
    dataset_name="test_dataset1", 
    description="A test dataset"
)

# Create dataset from recorded trace
dataset_traced = dataset.from_trace(trace_id=tracer.id, trace_filter=None)

# Create dataset from json dataset
dataset_json = dataset.from_json(json_filepath=filepath, 
                                 schema={"key": "value"})
```

## Experiment Management
Allows creation, execution, and analysis of experiments
```python
from agentneo import Experiment

# To list the available experiments
Experiment.list_experiments(session=agent_session)

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
            "name": "goal_fulfillment_rate", 
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
            "name": "tool_correctness", 
            "config": {
                    "model": "gpt-4o-mini", 
                    "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY")
            }
    },
    {
            "name": "tool_call_success_rate", 
            "config": {
                    "model": "gpt-4o-mini", 
                    "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY")
            }
    },
    {
            "name": "goal_fulfillment_rate", 
            "config": {
                    "model": "gpt-4o-mini", 
                    "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY")
            }
    }
])

# To get the results of the experiments run
experiment.get_results(exp.id)
```