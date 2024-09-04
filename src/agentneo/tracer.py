import functools
import json
import time
import requests
import tempfile
import os
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID, uuid4
import sys
import builtins
from openai import AsyncOpenAI
import prompt_toolkit
from requests_toolbelt import MultipartEncoder
import logging

from langchain.callbacks.base import BaseCallbackHandler
from langchain.schema import LLMResult

from .agent_neo import AgentNeo

from prompt_toolkit import PromptSession
from prompt_toolkit.patch_stdout import patch_stdout


class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        return json.JSONEncoder.default(self, obj)


class Tracer:
    @classmethod
    def init(
        cls,
        session: AgentNeo,
        trace_llms: bool = False,
        trace_console: bool = False,
        metadata: dict = {},
    ):
        tracer = cls(session, metadata)
        tracer.trace_llms = trace_llms
        tracer.trace_console = trace_console
        tracer.log_dir = ".tracer_logs"
        if not os.path.exists(tracer.log_dir):
            os.makedirs(tracer.log_dir)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        tracer.llm_trace_file = os.path.join(
            tracer.log_dir, f"llm_traces_{timestamp}.log"
        )
        tracer.console_trace_file = os.path.join(
            tracer.log_dir, f"console_traces_{timestamp}.log"
        )

        tracer.setup_instrumentation()

        return tracer

    def __init__(self, session: AgentNeo, metadata: dict = {}):
        self.session = session
        self.run_id = uuid4()
        self.graph_run_id = None
        self.start_time = time.time()
        self.traced_nodes = set()
        self.traces = []
        self.server_url = session.base_url

        temp_dir = tempfile.gettempdir()
        self.log_file_path = os.path.join(temp_dir, f".neo_trace_{time.time()}.json")

        self.id = None
        self.last_upload_time = time.time()
        self.upload_threshold = 100

        self.original_AsyncOpenAI_init = AsyncOpenAI.__init__
        self.original_stdout = sys.stdout
        self.original_stderr = sys.stderr
        self.original_input = builtins.input
        self.original_prompt_session = PromptSession

        self.metadata = metadata

    def _log_to_file(self, file_path, message):
        with open(file_path, "a", encoding="utf-8") as f:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
            f.write(f"{timestamp} - {message}\n")

    def upload_trace(self):
        if not self.log_file_path or not os.path.exists(self.log_file_path):
            print("Warning: No trace file found to upload")
            return None

        headers = {"Authorization": f"Bearer {self.session.token}"}
        metadata_json = json.dumps(self.metadata)

        try:
            with open(self.log_file_path, "rb") as trace_file:
                files = {"trace_file": trace_file}
                data = {"metadata": metadata_json}

                response = requests.post(
                    f"{self.server_url}/trace/log_trace",
                    files=files,
                    data=data,
                    headers=headers,
                    timeout=60,
                )
                response.raise_for_status()

            self.id = response.json().get("id")
            print(f"Trace uploaded successfully. Trace ID: {self.id}")
            return self.id
        except requests.RequestException as e:
            print(f"Failed to upload trace: {str(e)}")
            return None

    def upload_console_llm_trace(self):
        if not self.trace_llms and not self.trace_console:
            print("Warning: No trace files to upload")
            return None

        headers = {"Authorization": f"Bearer {self.session.token}"}
        files = {}
        data = {"metadata": json.dumps(self.metadata)}

        if self.trace_llms and os.path.exists(self.llm_trace_file):
            files["llm_trace_file"] = (
                "llm_trace.log",
                open(self.llm_trace_file, "rb"),
                "text/plain",
            )

        if self.trace_console and os.path.exists(self.console_trace_file):
            files["console_trace_file"] = (
                "console_trace.log",
                open(self.console_trace_file, "rb"),
                "text/plain",
            )

        if not files:
            print("Warning: No trace files found to upload")
            return None

        try:
            multipart_data = MultipartEncoder(fields={**files, **data})
            headers["Content-Type"] = multipart_data.content_type

            response = requests.post(
                f"{self.server_url}/trace/log_trace_app",
                headers=headers,
                data=multipart_data,
                timeout=60,
            )
            response.raise_for_status()
            self.id = response.json().get("id")
            print(f"Info: Traces uploaded successfully. Trace ID: {self.id}")
            return self.id
        except requests.RequestException as e:
            print(f"Error: Failed to upload traces: {str(e)}")
            return None
        finally:
            for file in files.values():
                file[1].close()

    def __del__(self):
        if self.trace_llms or self.trace_console:
            self.upload_console_llm_trace()
        if self.log_file_path and os.path.exists(self.log_file_path):
            self.upload_trace()
            os.remove(self.log_file_path)
            print(f"Info: Temporary trace file removed: {self.log_file_path}")

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

    def setup_instrumentation(self):
        print("INFO: Setting up instrumentation")
        if self.trace_llms:
            print("INFO: Setting up LLM tracing")
            self._patch_openai()
            print(f"INFO: OpenAI calls will be logged to {self.llm_trace_file}")

        if self.trace_console:
            print("INFO: Setting up console tracing")
            print(
                f"INFO: Console output and input will be logged to {self.console_trace_file}"
            )
            self._patch_console()

        # print("INFO: Instrumentation setup complete")

    def _patch_openai(self):
        original_init = AsyncOpenAI.__init__

        @functools.wraps(original_init)
        def patched_init(client_self, *args, **kwargs):
            original_init(client_self, *args, **kwargs)
            self._patch_client_methods(client_self)

        AsyncOpenAI.__init__ = patched_init

    def _patch_client_methods(self, client):
        resources_to_patch = [
            client.chat.completions,
            client.completions,
            client.embeddings,
            # Add other resources as needed
        ]

        for resource in resources_to_patch:
            if hasattr(resource, "create"):
                original_create = resource.create
                resource.create = self._traced_method(original_create)

    def _traced_method(self, original_method):
        @functools.wraps(original_method)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await original_method(*args, **kwargs)
                end_time = time.time()

                trace_data = {
                    "method": f"{original_method.__qualname__}",
                    "duration": end_time - start_time,
                    "request": {
                        "args": self.json_serializable(args),
                        "kwargs": self.json_serializable(
                            {
                                k: v if k != "api_key" else "[REDACTED]"
                                for k, v in kwargs.items()
                            }
                        ),
                    },
                    "response": self.json_serializable(result),
                }

                self._log_to_file(
                    self.llm_trace_file, f"LLM TRACE: {json.dumps(trace_data)}"
                )
                return result
            except Exception as e:
                self._log_to_file(
                    self.llm_trace_file,
                    f"Error tracing LLM call: {original_method.__qualname__} - {str(e)}",
                )
                raise

        return wrapper

    def _patch_console(self):
        class TracedStream:
            def __init__(self, original_stream, stream_name, tracer):
                self.original_stream = original_stream
                self.stream_name = stream_name
                self.tracer = tracer
                self._internal_buffer = []
                self._buffer = getattr(original_stream, "buffer", original_stream)

            def write(self, message):
                self.original_stream.write(message)
                self._internal_buffer.append(message)
                if "\n" in message:
                    self.flush()

            def flush(self):
                if self._internal_buffer:
                    full_message = "".join(self._internal_buffer).strip()
                    if full_message:
                        self.tracer._log_to_file(
                            self.tracer.console_trace_file,
                            f"CONSOLE ({self.stream_name.upper()}): {full_message}",
                        )
                    self._internal_buffer = []
                self.original_stream.flush()

            def __getattr__(self, name):
                return getattr(self.original_stream, name)

            @property
            def buffer(self):
                return self._buffer

        traced_stdout = TracedStream(sys.stdout, "stdout", self)
        traced_stderr = TracedStream(sys.stderr, "stderr", self)

        sys.stdout = traced_stdout
        sys.stderr = traced_stderr

        def traced_input(prompt=""):
            self._log_to_file(
                self.console_trace_file, f"CONSOLE (INPUT PROMPT): {prompt}"
            )
            user_input = self.original_input(prompt)
            self._log_to_file(
                self.console_trace_file, f"CONSOLE (USER INPUT): {user_input}"
            )
            return user_input

        builtins.input = traced_input

        # Patch prompt_toolkit's PromptSession
        original_prompt_session = PromptSession

        class TracedPromptSession(original_prompt_session):
            def __init__(self_, *args, **kwargs):
                self_.tracer = self
                super().__init__(*args, **kwargs)

            def prompt(self_, *args, **kwargs):
                prompt = args[0] if args else kwargs.get("message", "")
                self_.tracer._log_to_file(
                    self_.tracer.console_trace_file,
                    f"CONSOLE (PROMPT_TOOLKIT INPUT PROMPT): {prompt}",
                )

                with patch_stdout():
                    result = super().prompt(*args, **kwargs)

                self_.tracer._log_to_file(
                    self_.tracer.console_trace_file,
                    f"CONSOLE (PROMPT_TOOLKIT USER INPUT): {result}",
                )
                return result

            async def prompt_async(self_, *args, **kwargs):
                prompt = args[0] if args else kwargs.get("message", "")
                self_.tracer._log_to_file(
                    self_.tracer.console_trace_file,
                    f"CONSOLE (PROMPT_TOOLKIT ASYNC INPUT PROMPT): {prompt}",
                )

                with patch_stdout():
                    result = await super().prompt_async(*args, **kwargs)

                self_.tracer._log_to_file(
                    self_.tracer.console_trace_file,
                    f"CONSOLE (PROMPT_TOOLKIT ASYNC USER INPUT): {result}",
                )
                return result

        prompt_toolkit.PromptSession = TracedPromptSession

    def get_traced_prompt_session(self):
        return getattr(self, "traced_prompt_session", None)

    def cleanup(self):
        if self.trace_llms:
            AsyncOpenAI.__init__ = self.original_AsyncOpenAI_init
        if self.trace_console:
            sys.stdout = self.original_stdout
            sys.stderr = self.original_stderr
            builtins.input = self.original_input

            prompt_toolkit.PromptSession = self.original_prompt_session

        self._log_to_file(self.console_trace_file, "Tracing cleanup completed")

    @staticmethod
    def json_serializable(obj, max_depth=10):
        def _serialize(o, depth=0):
            if depth > max_depth:
                return str(o)

            if isinstance(o, (str, int, float, bool, type(None))):
                return o
            elif isinstance(o, (list, tuple)):
                return [_serialize(item, depth + 1) for item in o]
            elif isinstance(o, dict):
                return {
                    str(key): _serialize(value, depth + 1) for key, value in o.items()
                }
            elif hasattr(o, "dict"):  # For pydantic models
                try:
                    return _serialize(o.dict(), depth + 1)
                except Exception:
                    return str(o)
            elif hasattr(o, "__dict__"):
                return _serialize(vars(o), depth + 1)
            else:
                return str(o)

        try:
            return _serialize(obj)
        except Exception as e:
            return f"Error serializing object: {str(e)}"


class NeoCallbackHandler(BaseCallbackHandler):
    def __init__(self, neo_tracer: Tracer):
        self.neo_tracer = neo_tracer

    def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any
    ) -> None:
        self.neo_tracer._log_event(
            "llm_start",
            {
                "serialized": json.loads(json.dumps(serialized, cls=UUIDEncoder)),
                "prompts": prompts,
                "kwargs": json.loads(json.dumps(kwargs, cls=UUIDEncoder)),
            },
        )

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        latency = None
        token_usage = {}
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


def get_tracer(
    session: AgentNeo,
    trace_llms: bool = True,
    trace_console: bool = True,
) -> Tracer:
    return Tracer.init(session, trace_llms, trace_console)
