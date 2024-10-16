from persistent import Persistent
from persistent.list import PersistentList
from persistent.mapping import PersistentMapping
from BTrees.OOBTree import OOBTree
from datetime import datetime


class Project(Persistent):
    def __init__(self, id, project_name):
        self.id = id
        self.project_name = project_name
        self.start_time = datetime.now()
        self.end_time = None
        self.duration = None
        self.total_cost = PersistentMapping()
        self.total_tokens = PersistentMapping()
        self.traces = OOBTree()


class Trace(Persistent):
    def __init__(self, id):
        self.id = id
        self.start_time = datetime.now()
        self.end_time = None
        self.duration = None
        self.system_info = SystemInfo()
        self.llm_calls = OOBTree()
        self.tool_calls = OOBTree()
        self.agent_calls = OOBTree()
        self.metrics = OOBTree()
        self.user_interactions = PersistentList()


class SystemInfo(Persistent):
    def __init__(self):
        self.os_name = ""
        self.os_version = ""
        self.python_version = ""
        self.cpu_info = ""
        self.gpu_info = ""
        self.disk_info = ""
        self.memory_total = 0.0
        self.installed_packages = PersistentMapping()


class LLMCall(Persistent):
    def __init__(self, id, agent_id, name, model):
        self.id = id
        self.agent_id = agent_id
        self.name = name
        self.model = model
        self.input_prompt = PersistentMapping()
        self.output_text = PersistentMapping()
        self.output = PersistentMapping()
        self.tool_call = ""
        self.start_time = datetime.now()
        self.end_time = None
        self.duration = None
        self.token_usage = PersistentMapping()
        self.cost = PersistentMapping()
        self.memory_used = 0
        self.user_interactions = PersistentList()
        self.errors = PersistentList()


class ToolCall(Persistent):
    def __init__(self, id, agent_id, name):
        self.id = id
        self.agent_id = agent_id
        self.name = name
        self.input_parameters = PersistentMapping()
        self.output = PersistentMapping()
        self.start_time = datetime.now()
        self.end_time = None
        self.duration = None
        self.memory_used = 0
        self.network_calls = PersistentList()
        self.user_interactions = PersistentList()
        self.errors = PersistentList()


class AgentCall(Persistent):
    def __init__(self, id, name):
        self.id = id
        self.name = name
        self.start_time = datetime.now()
        self.end_time = None
        self.llm_calls = OOBTree()
        self.tool_calls = OOBTree()
        self.network_calls = PersistentList()
        self.user_interactions = PersistentList()
        self.errors = PersistentList()


class UserInteraction(Persistent):
    def __init__(self, type, content):
        self.type = type
        self.timestamp = datetime.now()
        self.content = content


class Error(Persistent):
    def __init__(self, id, error_type, error_message, stack_trace):
        self.id = id
        self.error_type = error_type
        self.error_message = error_message
        self.stack_trace = stack_trace
        self.timestamp = datetime.now()


class NetworkCall(Persistent):
    def __init__(self):
        self.timestamp = datetime.now()
        self.request = PersistentMapping()
        self.response = PersistentMapping()


class Metric(Persistent):
    def __init__(self, id, metric_name):
        self.id = id
        self.metric_name = metric_name
        self.score = None
        self.reason = ""
        self.result_detail = PersistentMapping()
        self.config = PersistentMapping()
        self.start_time = datetime.now()
        self.end_time = None
        self.duration = None
        self.timestamp = datetime.now()
