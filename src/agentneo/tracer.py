import functools
import json
import logging
import time
import requests
import tempfile
import os
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID, uuid4

from langchain.callbacks.base import BaseCallbackHandler
from langchain.schema import LLMResult

from .agent_neo import AgentNeo


class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        return json.JSONEncoder.default(self, obj)


class Tracer:
    def __init__(
        self,
        session: AgentNeo,
    ):
        self.session = session
        self.logger = logging.getLogger("neo_tracer")
        self.logger.setLevel(logging.DEBUG)
        self.run_id = uuid4()
        self.graph_run_id = None
        self.start_time = time.time()
        self.traced_nodes = set()
        self.traces = []
        self.server_url = session.base_url

        # save the trace to a temp file
        temp_dir = tempfile.gettempdir()
        self.log_file_path = os.path.join(temp_dir, f"neo_trace_{time.time()}.json")

        self.id = None
        self.last_upload_time = time.time()
        self.upload_threshold = 100

    def upload_trace(self):
        if not self.log_file_path or not os.path.exists(self.log_file_path):
            self.logger.error("No trace file found to upload")
            return None

        headers = {"Authorization": f"Bearer {self.session.token}"}
        files = {"trace_file": open(self.log_file_path, "rb")}

        try:
            response = requests.post(
                f"{self.server_url}/trace/log_trace", headers=headers, files=files
            )
            response.raise_for_status()
            self.id = response.json().get("id")
            self.logger.info(f"Trace uploaded successfully. Trace ID: {self.id}")
            return self.id
        except requests.RequestException as e:
            self.logger.error(f"Failed to upload trace: {str(e)}")
            return None
        finally:
            files["trace_file"].close()

    def __del__(self):
        if self.log_file_path and os.path.exists(self.log_file_path):
            self.upload_trace()
            os.remove(self.log_file_path)
            self.logger.debug(f"Temporary trace file removed: {self.log_file_path}")

    def _log_event(self, event_type: str, data: Dict[str, Any]):
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "run_id": str(self.run_id),
            "graph_run_id": str(self.graph_run_id) if self.graph_run_id else None,
            "data": data,
        }
        self.traces.append(log_entry)
        with open(self.log_file_path, "a") as f:
            json.dump(log_entry, f, cls=UUIDEncoder)
            f.write("\n")

    def trace_node(self, func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if func.__name__ not in self.traced_nodes:
                self.traced_nodes.add(func.__name__)
                node_run_id = str(uuid4())
                start_time = time.time()
                self._log_event(
                    "node_start",
                    {
                        "name": func.__name__,
                        "node_run_id": node_run_id,
                        "args": str(args),
                        "kwargs": str(kwargs),
                    },
                )
                try:
                    result = func(*args, **kwargs)
                    return result
                finally:
                    end_time = time.time()
                    self._log_event(
                        "node_end",
                        {
                            "name": func.__name__,
                            "node_run_id": node_run_id,
                            "result": str(result) if "result" in locals() else None,
                            "execution_time": end_time - start_time,
                        },
                    )
                    self.traced_nodes.remove(func.__name__)
            else:
                return func(*args, **kwargs)

        return wrapper

    def trace_graph(self, graph_class_or_func):
        if isinstance(graph_class_or_func, type):

            class TracedGraph(graph_class_or_func):
                def __init__(self_, *args, **kwargs):
                    super().__init__(*args, **kwargs)
                    self_.neo_tracer = self

                def add_node(self_, key, action):
                    traced_action = self.trace_node(action)
                    return super().add_node(key, traced_action)

                def __call__(self_, *args, **kwargs):
                    self.graph_run_id = uuid4()
                    start_time = time.time()
                    self._log_event(
                        "graph_compile_start",
                        {
                            "graph_run_id": str(self.graph_run_id),
                            "args": str(args),
                            "kwargs": str(kwargs),
                        },
                    )
                    try:
                        result = super().__call__(*args, **kwargs)
                        return result
                    finally:
                        end_time = time.time()
                        self._log_event(
                            "graph_compile_end",
                            {
                                "graph_run_id": str(self.graph_run_id),
                                "result": str(result) if "result" in locals() else None,
                                "execution_time": end_time - start_time,
                            },
                        )
                        self.graph_run_id = None

            return TracedGraph
        else:

            @functools.wraps(graph_class_or_func)
            def wrapper(*args, **kwargs):
                self.graph_run_id = uuid4()
                start_time = time.time()
                self._log_event(
                    "graph_compile_start",
                    {
                        "graph_run_id": str(self.graph_run_id),
                        "args": str(args),
                        "kwargs": str(kwargs),
                    },
                )
                try:
                    result = graph_class_or_func(*args, **kwargs)
                    return result
                finally:
                    end_time = time.time()
                    self._log_event(
                        "graph_compile_end",
                        {
                            "graph_run_id": str(self.graph_run_id),
                            "result": str(result) if "result" in locals() else None,
                            "execution_time": end_time - start_time,
                        },
                    )
                    self.graph_run_id = None

            return wrapper

    def get_callback_handler(self):
        return NeoCallbackHandler(self)


class NeoCallbackHandler(BaseCallbackHandler):
    def __init__(self, neo_tracer: Tracer):
        super().__init__()
        self.neo_tracer = neo_tracer
        self.start_time = None

    def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any
    ) -> None:
        self.start_time = time.time()
        self.neo_tracer._log_event(
            "llm_start",
            {
                "serialized": json.loads(json.dumps(serialized, cls=UUIDEncoder)),
                "prompts": prompts,
                "kwargs": json.loads(json.dumps(kwargs, cls=UUIDEncoder)),
            },
        )

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        end_time = time.time()
        latency = end_time - self.start_time if self.start_time else None

        token_usage = {}
        if hasattr(response, "llm_output") and isinstance(response.llm_output, dict):
            token_usage = response.llm_output.get("token_usage", {})

        if not token_usage and response.generations:
            for generation in response.generations:
                if generation and hasattr(generation[0], "generation_info"):
                    token_usage = generation[0].generation_info.get("token_usage", {})
                    if token_usage:
                        break

        self.neo_tracer._log_event(
            "llm_end",
            {
                "response": json.loads(json.dumps(response.dict(), cls=UUIDEncoder)),
                "latency": latency,
                "token_usage": token_usage,
                "model_name": kwargs.get("invocation_params", {}).get(
                    "model", "unknown"
                ),
                "kwargs": json.loads(json.dumps(kwargs, cls=UUIDEncoder)),
            },
        )
