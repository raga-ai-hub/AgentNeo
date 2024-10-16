import asyncio
import json
import platform
import psutil
import cpuinfo
import GPUtil
import pkg_resources
import traceback
from datetime import datetime, timedelta
from pathlib import Path
import logging
import threading

from ..data.data_models import Project, Trace, SystemInfo, Error

from ZODB import DB
from ZODB.FileStorage import FileStorage
from BTrees.OOBTree import OOBTree
import transaction


class BaseTracer:
    def __init__(self, session):
        self.user_session = session
        self.project_name = session.project_name

        # Setup DB
        storage = FileStorage(".mydata.fs")
        self.db = DB(storage)
        self.connection = self.db.open()
        self.root = self.connection.root()

        # Initialize or get the project
        self.project = self._get_or_create_project(self.project_name)
        self.project_id = self.project.id

        self.trace_data = {
            "project_info": {
                "project_name": self.project_name,
                "start_time": self.project.start_time,
            }
        }

        self.current_agent_id = threading.local()
        self.current_llm_call_name = threading.local()
        self.current_tool_call_ids = threading.local()
        self.current_llm_call_ids = threading.local()

    def _get_or_create_project(self, project_name: str) -> Project:
        if "projects" not in self.root:
            self.root["projects"] = OOBTree()

        if project_name not in self.root["projects"]:
            project_id = len(self.root["projects"]) + 1
            project = Project(project_id, project_name)
            self.root["projects"][project_name] = project
            transaction.commit()
            print(f"Project '{project_name}' created.")
        else:
            project = self.root["projects"][project_name]
            print(f"Project '{project_name}' found.")

        return project

    async def __aenter__(self):
        # Start the tracer when entering the async context
        self.start()
        return self

    async def __aexit__(self, exc_type, exc_value, tb):
        # End the tracer when exiting the async context
        self.stop()

    def start(self):
        print("Tracing Started.")

        # Create a new trace
        trace_id = len(self.project.traces) + 1
        self.trace = Trace(trace_id)
        self.project.traces[trace_id] = self.trace
        transaction.commit()

        self.trace_id = trace_id

        # Save the system information
        self._save_system_info()

    def stop(self):
        self.trace.end_time = datetime.now()
        self.trace.duration = (
            self.trace.end_time - self.trace.start_time
        ).total_seconds()

        self.project.end_time = self.trace.end_time
        if self.project.duration is None:
            self.project.duration = 0
        self.project.duration += self.trace.duration  # Accumulate duration

        trace_cost = sum(
            llm_call.cost.get("total", 0) for llm_call in self.trace.llm_calls.values()
        )
        trace_tokens = sum(
            llm_call.token_usage.get("total", 0)
            for llm_call in self.trace.llm_calls.values()
        )

        # Accumulate costs and tokens
        if "total" not in self.project.total_cost:
            self.project.total_cost["total"] = 0
        self.project.total_cost["total"] += trace_cost

        if "total" not in self.project.total_tokens:
            self.project.total_tokens["total"] = 0
        self.project.total_tokens["total"] += trace_tokens

        transaction.commit()

        self.trace_data["project_info"].update(
            {
                "end_time": self.trace.end_time,
                "duration": self.trace.duration,
                "total_cost": self.project.total_cost["total"],
                "total_tokens": self.project.total_tokens["total"],
            }
        )

        print(f"Tracing Completed.\nData saved to the database and JSON file.\n")

    def _save_system_info(self):
        os_name = platform.system()
        if os_name == "Darwin":
            os_version = platform.mac_ver()[0]
        else:
            os_version = platform.version()

        # Get GPU information
        try:
            gpus = GPUtil.getGPUs()
            gpu_info = [
                {"name": gpu.name, "memory_total": gpu.memoryTotal} for gpu in gpus
            ]
        except Exception as e:
            logging.warning(f"Failed to get GPU information: {e}")
            gpu_info = None

        # Get disk information
        disk = psutil.disk_usage("/")
        disk_info = {
            "total": disk.total / (1024**3),  # GB
            "available": disk.free / (1024**3),  # GB
        }

        system_info = SystemInfo()
        system_info.os_name = os_name
        system_info.os_version = os_version
        system_info.python_version = platform.python_version()
        system_info.cpu_info = cpuinfo.get_cpu_info()["brand_raw"]
        system_info.gpu_info = json.dumps(gpu_info) if gpu_info else None
        system_info.disk_info = json.dumps(disk_info)
        system_info.memory_total = psutil.virtual_memory().total / (1024**3)  # GB
        system_info.installed_packages = {
            pkg.key: pkg.version for pkg in pkg_resources.working_set
        }

        self.trace.system_info = system_info
        transaction.commit()

        self.trace_data["system_info"] = {
            "os_name": system_info.os_name,
            "os_version": system_info.os_version,
            "python_version": system_info.python_version,
            "cpu_info": system_info.cpu_info,
            "gpu_info": (
                json.loads(system_info.gpu_info) if system_info.gpu_info else None
            ),
            "disk_info": json.loads(system_info.disk_info),
            "memory_total": system_info.memory_total,
            "installed_packages": system_info.installed_packages,
        }

    def _save_to_json(self, log_file_path):
        def default_converter(o):
            if isinstance(o, datetime):
                return o.isoformat()
            elif isinstance(o, timedelta):
                return str(o)
            raise TypeError(
                f"Object of type {o.__class__.__name__} is not JSON serializable"
            )

        log_file = Path(log_file_path)
        log_file.parent.mkdir(parents=True, exist_ok=True)
        with log_file.open("w") as f:
            json.dump(self.trace_data, f, indent=2, default=default_converter)

    def _log_error(
        self, error: Exception, call_type: str, call_name: str, call_id: int = None
    ):
        error_info = {
            "type": call_type,
            "name": call_name,
            "error_message": str(error),
            "traceback": traceback.format_exc(),
            "timestamp": datetime.now(),
        }
        self.trace_data.setdefault("errors", []).append(error_info)
        print(f"Error in {call_type} '{call_name}': {error}")

        # Get current agent, tool, or LLM call IDs
        agent_id = self.current_agent_id.get()
        tool_call_id = None
        llm_call_id = None

        if call_type == "agent":
            agent_id = call_id
        elif call_type == "tool":
            tool_call_id = call_id
        elif call_type == "llm":
            llm_call_id = call_id

        # Save error to the database
        error_id = len(self.trace.errors) + 1
        error = Error(
            error_id, call_type, f"{call_name}: {str(error)}", error_info["traceback"]
        )

        if agent_id:
            agent_call = self.trace.agent_calls.get(agent_id)
            if agent_call:
                agent_call.errors.append(error)
        elif tool_call_id:
            tool_call = self.trace.tool_calls.get(tool_call_id)
            if tool_call:
                tool_call.errors.append(error)
        elif llm_call_id:
            llm_call = self.trace.llm_calls.get(llm_call_id)
            if llm_call:
                llm_call.errors.append(error)

        transaction.commit()

    def __del__(self):
        if hasattr(self, "connection"):
            self.connection.close()
