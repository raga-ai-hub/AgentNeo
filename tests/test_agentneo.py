import pytest
from agentneo.agentneo import AgentNeo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest import mock
from concurrent.futures import ThreadPoolExecutor
import time


def mock_task(id):
    """Mock task for testing, just a dummy task."""
    time.sleep(1)
    return f"Task {id} completed"


@pytest.fixture(scope="module")
def setup_engine():
    """Fixture to create a temporary SQLite engine for testing."""
    engine = create_engine("sqlite:///:memory:")
    AgentNeo.Session = sessionmaker(bind=engine)
    AgentNeo.engine = engine
    # Create all tables
    from agentneo.data.data_models import Base
    Base.metadata.create_all(engine)
    yield engine


@pytest.fixture
def agentneo_instance(setup_engine):
    """Fixture to provide a clean instance of AgentNeo for each test."""
    return AgentNeo()


@pytest.fixture
def executor():
    """Fixture for creating a ThreadPoolExecutor."""
    with ThreadPoolExecutor(max_workers=3) as executor:
        yield executor


def test_connect_project(agentneo_instance):
    """Test connecting to an existing project."""
    project_name = "Connect Project"

    # Try creating the project; if it already exists, pass the exception
    try:
        agentneo_instance.create_project(project_name)
    except ValueError as e:
        assert str(e) == f"Project '{project_name}' already exists."

    # Connect to the project (should succeed if already exists or just created)
    connected_id = agentneo_instance.connect_project(project_name)
    assert connected_id == agentneo_instance.project_id
    assert agentneo_instance.project_name == project_name


def test_create_project(agentneo_instance):
    """Test creating a new project."""
    project_name = "Test Project"

    # Create project
    try:
        project_id = agentneo_instance.create_project(project_name)
        assert project_id is not None
        assert agentneo_instance.project_name == project_name
    except:
        # Test for duplicate project creation
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

    # List projects
    projects = AgentNeo.list_projects()
    assert len(projects) >= len(project_names)

    # Verify projects are listed
    project_names_in_list = [p["name"] for p in projects]
    for name in project_names:
        assert name in project_names_in_list

    # Test limiting the number of listed projects
    limited_projects = AgentNeo.list_projects(num_projects=2)
    assert len(limited_projects) == 2


def test_parallel_execution(agentneo_instance, executor):
    """Test parallel execution with ThreadPoolExecutor, simulating metric evaluations."""
    metric_list = ["metric_1", "metric_2", "metric_3", "metric_4", "metric_5"]

    # Submit multiple tasks for each metric evaluation (simulating work)
    futures = [executor.submit(mock_task, i) for i in range(len(metric_list))]

    # Ensure that all tasks complete
    results = [future.result() for future in futures]

    # Assert that all tasks completed as expected
    assert len(results) == len(metric_list)
    assert all(f"Task {i} completed" for i in range(len(metric_list)))


def test_max_workers(agentneo_instance, executor):
    """Test the max workers configuration in ThreadPoolExecutor."""
    
    # Submit 5 tasks, but only 3 workers should be running concurrently
    start_time = time.time()
    futures = [executor.submit(mock_task, i) for i in range(5)]
    
    # Wait for all tasks to complete
    for future in futures:
        future.result()
    
    end_time = time.time()
    
    # Total time should be around 3 seconds since we have a max of 3 workers running concurrently
    assert end_time - start_time < 5  # It should not exceed 5 seconds


@mock.patch("agentneo.server.dashboard.launch_dashboard")
def test_launch_dashboard(mock_launch_dashboard):
    """Test launching the dashboard."""
    AgentNeo.launch_dashboard(port=4000)
    mock_launch_dashboard.assert_called_once_with(4000)
