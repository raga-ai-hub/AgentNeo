from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional


@dataclass
class ProjectInfo:
    project_name: str
    start_time: float
    end_time: float = field(default=0)
    duration: float = field(default=0)
    total_cost: float = field(default=0)
    total_tokens: int = field(default=0)


@dataclass
class SystemInfo:
    project_id: int
    os_name: str
    os_version: str
    python_version: str
    cpu_info: str
    memory_total: float
    installed_packages: str


@dataclass
class LLMCall:
    name: str
    model_name: str
    input_prompt: str
    output_response: str
    tool_call: Dict
    token_usage: Dict[str, int]
    cost: Dict[str, float]
    start_time: float = field(default=0)
    end_time: float = field(default=0)
    duration: float = field(default=0)


@dataclass
class ToolCall:
    name: str
    input_parameters: Dict[str, Any]
    output: Any
    start_time: float
    end_time: float
    duration: float
    errors: Optional[str] = None


@dataclass
class AgentCall:
    name: str
    input_parameters: Dict[str, Any]
    output: Any
    start_time: float
    end_time: float
    duration: float
    tool_calls: List[Dict[str, Any]]
    llm_calls: List[Dict[str, Any]]
    errors: Optional[str] = None
