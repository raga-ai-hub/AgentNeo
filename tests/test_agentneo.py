import pytest
from datetime import datetime
from unittest import mock
from sqlalchemy import create_engine, inspect
from agentneo.agentneo import AgentNeo
from agentneo.evaluation.evaluation import Evaluation
from agentneo.data.data_models import (
    TraceModel, 
    MetricModel, 
    ProjectInfoModel, 
    SystemInfoModel,
    Base
)
import json
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="session")
def setup_engine():
    """Fixture to create a temporary SQLite engine for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.drop_all(engine)
    
    # Ensure all models are registered
    from agentneo.data import data_models
    
    Base.metadata.create_all(engine)
    AgentNeo.Session = sessionmaker(bind=engine)
    AgentNeo.engine = engine
    
    # Verify tables were created
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    assert 'traces' in tables, f"Tables created: {tables}"
    
    yield engine

@pytest.fixture
def agentneo_instance(setup_engine):
    """Fixture to provide a clean instance of AgentNeo for each test."""
    return AgentNeo()

@pytest.fixture
def sample_trace_data(setup_engine, agentneo_instance):
    """Create sample trace data in the database"""
    session = AgentNeo.Session()
    
    # Create or connect to test project
    project_name = "Test Project"
    try:
        agentneo_instance.create_project(project_name)
    except ValueError:
        agentneo_instance.connect_project(project_name)
    
    # Create trace
    trace = TraceModel(
        project_id=agentneo_instance.project_id,
        start_time=datetime.now(),
        end_time=datetime.now()
    )
    session.add(trace)
    session.flush()
    
    # Create system info
    system_info = SystemInfoModel(
        project_id=agentneo_instance.project_id,
        trace_id=trace.id,
        os_name="Test OS",
        os_version="1.0",
        python_version="3.8",
        cpu_info="Test CPU",
        memory_total=8589934592,
        gpu_info="Test GPU",
        disk_info=json.dumps({"total": 256000000000}),
        installed_packages=json.dumps({"python": "3.8", "pytest": "7.0"})
    )
    session.add(system_info)
    session.commit()
    
    return trace.id

@pytest.fixture
def evaluation_instance(agentneo_instance, sample_trace_data):
    """Create an Evaluation instance for testing"""
    return Evaluation(agentneo_instance, sample_trace_data)

# AgentNeo Tests
def test_connect_project(agentneo_instance):
    """Test connecting to an existing project."""
    project_name = "Connect Project"

    try:
        agentneo_instance.create_project(project_name)
    except ValueError as e:
        assert str(e) == f"Project '{project_name}' already exists."

    connected_id = agentneo_instance.connect_project(project_name)
    assert connected_id == agentneo_instance.project_id
    assert agentneo_instance.project_name == project_name

def test_create_project(agentneo_instance):
    """Test creating a new project."""
    project_name = "Test Project"

    try:
        project_id = agentneo_instance.create_project(project_name)
        assert project_id is not None
        assert agentneo_instance.project_name == project_name
    except:
        with pytest.raises(ValueError, match=f"Project '{project_name}' already exists."):
            agentneo_instance.create_project(project_name)

def test_list_projects(agentneo_instance):
    """Test listing projects."""
    project_names = ["Project 1", "Project 2", "Project 3"]

    for name in project_names:
        try:
            agentneo_instance.create_project(name)
        except ValueError as e:
            assert str(e) == f"Project '{name}' already exists."

    projects = AgentNeo.list_projects()
    assert len(projects) >= len(project_names)

    project_names_in_list = [p["name"] for p in projects]
    for name in project_names:
        assert name in project_names_in_list

    limited_projects = AgentNeo.list_projects(num_projects=2)
    assert len(limited_projects) == 2

@mock.patch("agentneo.server.dashboard.launch_dashboard")
def test_launch_dashboard(mock_launch_dashboard):
    """Test launching the dashboard."""
    AgentNeo.launch_dashboard(port=4000)
    mock_launch_dashboard.assert_called_once_with(4000)

# Evaluation Tests
def test_evaluation_initialization(evaluation_instance):
    """Test proper initialization of Evaluation class"""
    assert evaluation_instance.project_name == "Test Project"
    assert evaluation_instance.trace_id is not None
    assert evaluation_instance.engine is not None
    assert evaluation_instance.session is not None

def test_chunk_metrics():
    """Test the chunk_metrics static method"""
    metrics = ['metric1', 'metric2', 'metric3', 'metric4', 'metric5']
    chunks = list(Evaluation.chunk_metrics(metrics, 2))
    assert len(chunks) == 3
    assert chunks == [['metric1', 'metric2'], ['metric3', 'metric4'], ['metric5']]

def test_evaluate_empty_metric_list(evaluation_instance):
    """Test evaluate method with empty metric list"""
    with pytest.raises(ValueError, match="The metric list cannot be empty."):
        evaluation_instance.evaluate([])

def test_evaluate_with_invalid_metric(evaluation_instance):
    """Test evaluate method with invalid metric name"""
    result = evaluation_instance.evaluate(['invalid_metric'])

def test_evaluate_with_valid_metrics(evaluation_instance):
    """Test evaluate method with valid metrics"""
    metrics = ['goal_decomposition_efficiency', 'goal_fulfillment_rate']
    evaluation_instance.evaluate(
        metric_list=metrics,
        config={},
        metadata={},
        max_workers=2,
        max_evaluations_per_thread=1
    )
    
    results = evaluation_instance.get_results()
    assert isinstance(results, list)

def test_get_results(setup_engine, evaluation_instance):
    """Test getting evaluation results"""
    metric = MetricModel(
        trace_id=evaluation_instance.trace_id,
        metric_name="test_metric",
        score=0.8,
        reason="Test reason",
        result_detail={"detail": "test"},
        config={},
        start_time=datetime.now(),
        end_time=datetime.now(),
        duration=1.0
    )
    evaluation_instance.session.add(metric)
    evaluation_instance.session.commit()
    
    results = evaluation_instance.get_results()
    assert len(results) > 0
    assert isinstance(results[0], dict)
    assert 'metric_name' in results[0]
    assert 'score' in results[0]

def test_get_trace_data_invalid_id(agentneo_instance):
    """Test getting trace data with invalid trace ID"""
    with pytest.raises(ValueError):
        Evaluation(agentneo_instance, -1)

def test_parallel_processing_configuration(setup_engine, evaluation_instance):
    """Test parallel processing configuration"""
    metrics = ['goal_decomposition_efficiency'] * 5
    
    evaluation_instance.evaluate(metrics, max_workers=2)
    evaluation_instance.evaluate(metrics, max_workers=2, max_evaluations_per_thread=2)
    evaluation_instance.evaluate(metrics, max_workers=-1, max_evaluations_per_thread=-1)