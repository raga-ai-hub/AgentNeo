import time
import inspect
import asyncio
import platform
import cpuinfo
import functools
import json
import sys
from pathlib import Path
import contextvars
from typing import Dict, Any, Callable, Coroutine, Optional
import traceback
import psutil
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
import pkg_resources
import functools

from .utils import calculate_cost, convert_usage_to_dict, load_model_costs
from .llm_provider import extract_llm_output
from .data import (
    Base,
    ProjectInfoModel,
    LLMCallModel,
    ToolCallModel,
    AgentCallModel,
    SystemInfoModel,
    ErrorModel,
    TraceModel,
)


from .network_tracer import (
    NetworkTracer,
    monkey_patch_urllib,
    restore_urllib,
    monkey_patch_requests,
    restore_requests,
    monkey_patch_http_client,
    restore_http_client,
    monkey_patch_socket,
    restore_socket,
    patch_aiohttp_trace_config,
)


class Tool:
    def __init__(self, func: Callable, name: str, description: str):
        self.func = func
        self.name = name
        self.description = description


class Tracer:
    def __init__(
        self,
        session,
        log_file_path: Optional[str] = None,
        auto_instrument_llm: bool = True,
    ):
        self.user_session = session
        project_name = session.project_name

        # Setup DB
        self.db_path = session.db_path
        self.engine = create_engine(self.db_path)

        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

        self.project_info = self._get_project(project_name)
        if self.project_info is None:
            raise ValueError(
                f"Project '{project_name}' does not exist. Please create a project first."
            )
        self.project_id = self.project_info.id

        self.log_file_path = log_file_path
        self.trace_data = {
            "project_info": {
                "project_name": project_name,
                "start_time": self.project_info.start_time,
            },
            "llm_calls": [],
            "tool_calls": [],
            "agent_calls": [],
            "errors": [],
        }

        self.call_depth = contextvars.ContextVar("call_depth", default=0)

        if "openai" in sys.modules:
            from openai import OpenAI, AsyncOpenAI

            self.client = OpenAI()
            self.async_client = AsyncOpenAI()
        else:
            self.client = None
            self.async_client = None

        if "litellm" in sys.modules:
            import litellm

        self.original_funcs = {}
        self.tools: Dict[str, Tool] = {}
        self.auto_instrument_llm = auto_instrument_llm

        if self.auto_instrument_llm:
            self.instrument_llm_calls()

        self.trace_id = None
        self.trace = None

    def __enter__(self):
        # Start the tracer when entering the context
        self.start()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        # End the tracer when exiting the context
        self.end()

    async def __aenter__(self):
        # Start the tracer when entering the async context
        self.start()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        # End the tracer when exiting the async context
        self.end()

    def start(self):
        print("Tracing Started.")

        # Create a new trace
        with self.Session() as session:
            trace = TraceModel(project_id=self.project_id, start_time=datetime.now())
            session.add(trace)
            session.commit()
            self.trace_id = trace.id
            self.trace = trace

        # save the system information
        self._save_system_info()

    def _get_project(self, project_name: str) -> Optional[ProjectInfoModel]:
        with self.Session() as session:
            try:
                project = (
                    session.query(ProjectInfoModel)
                    .filter_by(project_name=project_name)
                    .first()
                )
                if project:
                    print(f"Project '{project_name}' found.")
                    return project
                else:
                    print(f"Project '{project_name}' does not exist.")
                    return None
            except SQLAlchemyError as e:
                print(f"An error occurred while accessing the database: {e}")
                raise

    def stop(self):
        with self.Session() as session:
            project = session.query(ProjectInfoModel).get(self.project_id)
            if project is None:
                raise ValueError(f"Project with id {self.project_id} not found")

            trace = session.query(TraceModel).get(self.trace_id)
            if trace is None:
                raise ValueError(f"Trace with id {self.trace_id} not found")

            trace.end_time = datetime.now()
            trace.duration = (trace.end_time - trace.start_time).total_seconds()

            project.end_time = trace.end_time
            project.duration += trace.duration  # accumulate duration

            llm_calls = (
                session.query(LLMCallModel).filter_by(trace_id=self.trace_id).all()
            )
            trace_cost = sum(
                json.loads(llm_call.cost)["input"]
                + json.loads(llm_call.cost)["completion"]
                + json.loads(llm_call.cost)["reasoning"]
                for llm_call in llm_calls
            )
            trace_tokens = sum(
                json.loads(llm_call.token_usage)["input"]
                + json.loads(llm_call.token_usage)["completion"]
                + json.loads(llm_call.token_usage)["reasoning"]
                for llm_call in llm_calls
            )

            # Accumulate costs and tokens instead of overwriting
            project.total_cost += trace_cost
            project.total_tokens += trace_tokens

            session.commit()

            end_time = trace.end_time
            duration = trace.duration
            total_cost = project.total_cost
            total_tokens = project.total_tokens

        self.trace_data["project_info"].update(
            {
                "end_time": end_time,
                "duration": duration,
                "total_cost": total_cost,
                "total_tokens": total_tokens,
            }
        )

        if self.log_file_path:
            self._save_to_json()

        print(f"Tracing Completed.\nData saved to the database and JSON file.\n")

    def _save_system_info(self):
        os_name = platform.system()
        if os_name == "Darwin":
            os_version = platform.mac_ver()[0]
        else:
            os_version = platform.version()

        system_info = SystemInfoModel(
            project_id=self.project_id,
            trace_id=self.trace_id,
            os_name=os_name,
            os_version=os_version,
            python_version=platform.python_version(),
            cpu_info=cpuinfo.get_cpu_info()["brand_raw"],
            memory_total=psutil.virtual_memory().total
            / (1024**3),  # Total memory in GB
            installed_packages=json.dumps(
                {pkg.key: pkg.version for pkg in pkg_resources.working_set}
            ),
        )

        with self.Session() as session:
            session.add(system_info)
            session.commit()

            self.trace_data["system_info"] = {
                "os_name": system_info.os_name,
                "os_version": system_info.os_version,
                "python_version": system_info.python_version,
                "cpu_info": system_info.cpu_info,
                "memory_total": system_info.memory_total,
                "installed_packages": json.loads(system_info.installed_packages),
            }

    def _save_to_json(self):
        def default_converter(o):
            if isinstance(o, datetime):
                return o.isoformat()
            elif isinstance(o, timedelta):
                return str(o)
            raise TypeError(
                f"Object of type {o.__class__.__name__} is not JSON serializable"
            )

        log_file = Path(self.log_file_path)
        log_file.parent.mkdir(parents=True, exist_ok=True)
        with log_file.open("w") as f:
            json.dump(self.trace_data, f, indent=2, default=default_converter)

    def trace_tool(self, name: str, description: str = ""):
        self.network_tracer = NetworkTracer()

        def decorator(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                self.network_tracer.activate_patches()  # Activate patches before execution
                try:
                    return await self._trace_tool_call_async(
                        func, name, description, *args, **kwargs
                    )
                finally:
                    self.network_tracer.deactivate_patches()  # Deactivate patches after execution

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                self.network_tracer.activate_patches()  # Activate patches before execution
                try:
                    return self._trace_tool_call_sync(
                        func, name, description, *args, **kwargs
                    )
                finally:
                    self.network_tracer.deactivate_patches()  # Deactivate patches after execution

            return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

        return decorator

    async def _trace_tool_call_async(self, func, name, description, *args, **kwargs):
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss

        try:
            if asyncio.iscoroutinefunction(func):
                trace_config = await patch_aiohttp_trace_config(self.network_tracer)
                result = await func(*args, **kwargs, trace_config=trace_config)
            else:
                result = await asyncio.to_thread(func, *args, **kwargs)

            end_time = datetime.now()
            end_memory = psutil.Process().memory_info().rss
            memory_used = end_memory - start_memory

            tool_call = ToolCallModel(
                project_id=self.project_id,
                trace_id=self.trace_id,
                name=name,
                # description=description,
                input_parameters=json.dumps(args) if args else json.dumps(kwargs),
                output=str(result),
                start_time=start_time,
                end_time=end_time,
                duration=(end_time - start_time).total_seconds(),
                memory_used=memory_used,
                network_calls=str(self.network_tracer.network_calls),
            )
            with self.Session() as session:
                session.add(tool_call)
                session.commit()

            tool_call_data = {
                "name": name,
                "description": description,
                "input_parameters": json.dumps(args) if args else json.dumps(kwargs),
                "output": str(result),
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration": (end_time - start_time).total_seconds(),
                "memory_used": memory_used,
                "network_calls": self.network_tracer.network_calls,
            }

            self.trace_data["tool_calls"].append(tool_call_data)

            return result
        except Exception as e:
            self._log_error(e, "tool", name)
            raise

    def _trace_tool_call_sync(self, func, name, description, *args, **kwargs):
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss

        try:
            result = func(*args, **kwargs)

            end_time = datetime.now()
            end_memory = psutil.Process().memory_info().rss
            memory_used = end_memory - start_memory

            tool_call = ToolCallModel(
                project_id=self.project_id,
                trace_id=self.trace_id,
                name=name,
                # description=description,
                input_parameters=json.dumps(args) if args else json.dumps(kwargs),
                output=str(result),
                start_time=start_time,
                end_time=end_time,
                duration=(end_time - start_time).total_seconds(),
                memory_used=memory_used,
                network_calls=str(self.network_tracer.network_calls),
            )
            with self.Session() as session:
                session.add(tool_call)
                session.commit()

            tool_call_data = {
                "name": name,
                "description": description,
                "input_parameters": json.dumps(args) if args else json.dumps(kwargs),
                "output": str(result),
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration": (end_time - start_time).total_seconds(),
                "memory_used": memory_used,
                "network_calls": self.network_tracer.network_calls,
            }

            self.trace_data["tool_calls"].append(tool_call_data)

            return result
        except Exception as e:
            self._log_error(e, "tool", name)
            raise

    def trace_agent(self, name: str):
        def decorator(func_or_class):
            if isinstance(func_or_class, type):
                # If it's a class, wrap all its methods
                for attr_name, attr_value in func_or_class.__dict__.items():
                    if callable(attr_value) and not attr_name.startswith("__"):
                        setattr(
                            func_or_class,
                            attr_name,
                            self.trace_agent(f"{name}.{attr_name}")(attr_value),
                        )
                return func_or_class
            else:

                async def async_wrapper(*args, **kwargs):
                    start_time = datetime.now()
                    start_memory = psutil.Process().memory_info().rss
                    agent_context = {
                        "tool_calls": [],
                        "llm_calls": [],
                    }

                    # Create the agent call record first
                    agent_call = AgentCallModel(
                        project_id=self.project_id,
                        trace_id=self.trace_id,
                        name=name,
                        input_parameters=json.dumps(
                            {
                                k: str(v)
                                for k, v in kwargs.items()
                                if k not in ["tool_call", "llm_call"]
                            }
                        ),
                        output="",  # We'll update this later
                        start_time=start_time,
                        end_time=None,
                        duration=None,
                        tool_calls=[],
                        llm_calls=[],
                        memory_used=0,
                    )
                    with self.Session() as session:
                        session.add(agent_call)
                        session.commit()
                        agent_id = agent_call.id

                    async def wrapped_tool_call(tool_name: str, **tool_kwargs):
                        start_time = datetime.now()
                        start_memory = psutil.Process().memory_info().rss
                        tool_result = await self.tools[tool_name].func(**tool_kwargs)
                        end_time = datetime.now()
                        end_memory = psutil.Process().memory_info().rss
                        duration = (end_time - start_time).total_seconds()
                        memory_used = end_memory - start_memory
                        tool_call = ToolCallModel(
                            project_id=self.project_id,
                            trace_id=self.trace_id,
                            agent_id=agent_id,
                            name=tool_name,
                            input_parameters=json.dumps(tool_kwargs),
                            output=str(tool_result),
                            start_time=start_time,
                            end_time=end_time,
                            duration=duration,
                            memory_used=memory_used,
                        )
                        with self.Session() as session:
                            session.add(tool_call)
                            session.commit()
                            tool_call_id = tool_call.id

                        agent_context["tool_calls"].append(
                            {
                                "id": tool_call_id,
                                "name": tool_name,
                                "input": tool_kwargs,
                                "output": str(tool_result),
                            }
                        )
                        return tool_result

                    async def wrapped_llm_call(**llm_kwargs):
                        llm_result = await self.async_client.chat.completions.create(
                            **llm_kwargs
                        )
                        start_time = datetime.now()
                        start_memory = psutil.Process().memory_info().rss

                        end_time = datetime.now()
                        end_memory = psutil.Process().memory_info().rss
                        duration = (end_time - start_time).total_seconds()
                        memory_used = end_memory - start_memory

                        model_name = llm_kwargs.get("model", "")
                        cost = (
                            calculate_cost(model_name, llm_result.usage)
                            if model_name
                            else "0"
                        )

                        llm_call = LLMCallModel(
                            project_id=self.project_id,
                            trace_id=self.trace_id,
                            agent_id=agent_id,
                            name="agent_llm_call",
                            model=model_name,
                            input_prompt=json.dumps(llm_kwargs.get("messages", [])),
                            output=str(llm_result),
                            start_time=start_time,
                            end_time=end_time,
                            duration=duration,
                            token_usage=json.dumps(
                                llm_result.usage.dict() if llm_result.usage else {}
                            ),
                            cost=cost,
                            memory_used=memory_used,
                        )
                        with self.Session() as session:
                            session.add(llm_call)
                            session.commit()
                            llm_call_id = llm_call.id

                        agent_context["llm_calls"].append(
                            {
                                "id": llm_call_id,
                                "input": llm_kwargs,
                                "output": str(llm_result),
                            }
                        )
                        return llm_result

                    try:
                        if asyncio.iscoroutinefunction(func_or_class):
                            result = await func_or_class(*args, **kwargs)
                        else:
                            result = await asyncio.to_thread(
                                func_or_class, *args, **kwargs
                            )

                        end_time = datetime.now()
                        end_memory = psutil.Process().memory_info().rss
                        memory_used = end_memory - start_memory

                        # Update the agent call record
                        with self.Session() as session:
                            agent_call = session.query(AgentCallModel).get(agent_id)
                            agent_call.output = str(result)
                            agent_call.end_time = end_time
                            agent_call.duration = (
                                end_time - start_time
                            ).total_seconds()
                            agent_call.tool_calls = agent_context["tool_calls"]
                            agent_call.llm_calls = agent_context["llm_calls"]
                            agent_call.memory_used = memory_used
                            session.commit()

                        self.trace_data["agent_calls"].append(
                            {
                                "id": agent_id,
                                "name": name,
                                "input_parameters": kwargs,
                                "output": str(result),
                                "start_time": start_time,
                                "end_time": end_time,
                                "duration": end_time - start_time,
                                "tool_calls": agent_context["tool_calls"],
                                "llm_calls": agent_context["llm_calls"],
                                "memory_used": memory_used,
                            }
                        )
                    except Exception as e:
                        self._log_error(e, "agent", name)
                        raise

                    return result

                def sync_wrapper(*args, **kwargs):
                    try:
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            return async_wrapper(*args, **kwargs)
                        else:
                            return asyncio.run(async_wrapper(*args, **kwargs))
                    except RuntimeError:
                        return asyncio.run(async_wrapper(*args, **kwargs))

                return (
                    async_wrapper
                    if asyncio.iscoroutinefunction(func_or_class)
                    else sync_wrapper
                )

        return decorator

    def trace_llm(self, name: str):
        def decorator(func_or_class):
            if isinstance(func_or_class, type):
                # If it's a class, wrap all its methods
                for attr_name, attr_value in func_or_class.__dict__.items():
                    if callable(attr_value) and not attr_name.startswith("__"):
                        setattr(
                            func_or_class,
                            attr_name,
                            self.trace_llm(f"{name}.{attr_name}")(attr_value),
                        )
                return func_or_class
            else:

                @functools.wraps(func_or_class)
                async def async_wrapper(*args, **kwargs):
                    return await self._trace_llm_call_async(
                        func_or_class, name, *args, **kwargs
                    )

                @functools.wraps(func_or_class)
                def sync_wrapper(*args, **kwargs):
                    return self._trace_llm_call_sync(
                        func_or_class, name, *args, **kwargs
                    )

                return (
                    async_wrapper
                    if asyncio.iscoroutinefunction(func_or_class)
                    else sync_wrapper
                )

        return decorator

    async def _trace_llm_call_async(self, func, name, *args, **kwargs):
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss

        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = await asyncio.to_thread(func, *args, **kwargs)

            end_time = datetime.now()
            end_memory = psutil.Process().memory_info().rss
            memory_used = end_memory - start_memory

            sanitized_args = self._sanitize_api_keys(args)
            sanitized_kwargs = self._sanitize_api_keys(kwargs)
            if not self.auto_instrument_llm:
                self.process_llm_result(
                    result,
                    name,
                    self._extract_model_name(sanitized_kwargs),
                    self._extract_input(sanitized_args, sanitized_kwargs),
                    start_time,
                    end_time,
                    memory_used,
                )
            self.process_llm_result(
                result,
                name,
                self._extract_model_name(sanitized_kwargs),
                self._extract_input(sanitized_args, sanitized_kwargs),
                start_time,
                end_time,
                memory_used,
            )

            return result
        except Exception as e:
            self._log_error(e, "llm", name)
            raise

    def _trace_llm_call_sync(self, func, name, *args, **kwargs):
        # Synchronous version of the method
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss

        try:
            result = func(*args, **kwargs)

            end_time = datetime.now()
            end_memory = psutil.Process().memory_info().rss
            memory_used = end_memory - start_memory

            sanitized_args = self._sanitize_api_keys(args)
            sanitized_kwargs = self._sanitize_api_keys(kwargs)
            if not self.auto_instrument_llm:
                self.process_llm_result(
                    result,
                    name,
                    self._extract_model_name(sanitized_kwargs),
                    self._extract_input(sanitized_args, sanitized_kwargs),
                    start_time,
                    end_time,
                    memory_used,
                )

            return result
        except Exception as e:
            self._log_error(e, "llm", name)
            raise

    def _log_error(self, error: Exception, call_type: str, call_name: str):
        error_info = {
            "type": call_type,
            "name": call_name,
            "error_message": str(error),
            "traceback": traceback.format_exc(),
            "timestamp": datetime.now(),
        }
        self.trace_data["errors"].append(error_info)
        print(f"Error in {call_type} '{call_name}': {error}")

        # Save error to the database
        error_model = ErrorModel(
            project_id=self.project_id,
            trace_id=self.trace_id,
            error_type=call_type,
            error_message=f"{call_name}: {str(error)}",
            timestamp=error_info["timestamp"],
        )
        with self.Session() as session:
            session.add(error_model)
            session.commit()

    def instrument_llm_calls(self):
        # if "openai" in sys.modules:
        import openai

        self.patch_openai(openai.OpenAI)
        self.patch_openai(openai.AsyncOpenAI)

        # if "litellm" in sys.modules:
        import litellm

        self.patch_litellm(litellm)

    def patch_openai(self, client_class):
        original_init = client_class.__init__

        @functools.wraps(original_init)
        def patched_init(client_self, *args, **kwargs):
            original_init(client_self, *args, **kwargs)
            self.patch_method(client_self.chat.completions, "create")
            if hasattr(client_self.chat.completions, "acreate"):
                self.patch_method(client_self.chat.completions, "acreate")

        client_class.__init__ = patched_init

    def patch_litellm(self, litellm_module):
        self.patch_method(litellm_module, "completion")
        self.patch_method(litellm_module, "acompletion")

    def patch_method(self, obj, method_name):
        original_method = getattr(obj, method_name)

        @functools.wraps(original_method)
        def wrapper(*args, **kwargs):
            return self.trace_llm_call(original_method, *args, **kwargs)

        setattr(obj, method_name, wrapper)

    def trace_llm_call(self, original_method, *args, **kwargs):
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss

        try:
            result = original_method(*args, **kwargs)

            # Handle both synchronous and asynchronous results
            if asyncio.iscoroutine(result):
                return self.handle_async_result(
                    result, start_time, start_memory, args, kwargs
                )
            else:
                return self.handle_sync_result(
                    result, start_time, start_memory, args, kwargs
                )
        except Exception as e:
            self._log_error(e, "llm", original_method.__name__)
            raise

    async def handle_async_result(self, coro, start_time, start_memory, args, kwargs):
        try:
            result = await coro
            end_time = datetime.now()
            end_memory = psutil.Process().memory_info().rss
            memory_used = end_memory - start_memory

            # Remove API keys from args and kwargs before storing
            sanitized_args = self._sanitize_api_keys(args)
            sanitized_kwargs = self._sanitize_api_keys(kwargs)

            self.process_llm_result(
                result,
                "auto_async_call",
                self._extract_model_name(sanitized_kwargs),
                self._extract_input(sanitized_args, sanitized_kwargs),
                start_time,
                end_time,
                memory_used,
            )
            return result
        except Exception as e:
            self._log_error(e, "llm", "async_call")
            raise

    def handle_sync_result(self, result, start_time, start_memory, args, kwargs):
        end_time = datetime.now()
        end_memory = psutil.Process().memory_info().rss
        memory_used = end_memory - start_memory

        # Remove API keys from args and kwargs before storing
        sanitized_args = self._sanitize_api_keys(args)
        sanitized_kwargs = self._sanitize_api_keys(kwargs)

        self.process_llm_result(
            result,
            "auto_sync_call",
            self._extract_model_name(sanitized_kwargs),
            self._extract_input(sanitized_args, sanitized_kwargs),
            start_time,
            end_time,
            memory_used,
        )
        return result

    def _extract_model_name(self, sanitized_kwargs):
        if isinstance(sanitized_kwargs, dict):
            if "model" in sanitized_kwargs.keys():
                return str(sanitized_kwargs["model"])
        return ""

    def _extract_input(self, sanitized_args, sanitized_kwargs):
        if isinstance(sanitized_kwargs, dict):
            if "messages" in sanitized_kwargs.keys():
                return str(sanitized_kwargs["messages"])
        return str(sanitized_args) if str(sanitized_args) != "()" else ""

    def _sanitize_api_keys(self, data):
        if isinstance(data, dict):
            return {
                k: self._sanitize_api_keys(v)
                for k, v in data.items()
                if not k.lower().endswith("api_key")
            }
        elif isinstance(data, list):
            return [self._sanitize_api_keys(item) for item in data]
        elif isinstance(data, tuple):
            return tuple(self._sanitize_api_keys(item) for item in data)
        else:
            return data

    def process_llm_result(
        self, result, name, model, prompt, start_time, end_time, memory_used
    ):
        llm_data = extract_llm_output(result)

        llm_call = LLMCallModel(
            project_id=self.project_id,
            trace_id=self.trace_id,
            name=name,
            model=llm_data.model_name,
            input_prompt=prompt,
            output=llm_data.output_response,
            tool_call=(
                str(llm_data.tool_call) if llm_data.tool_call else llm_data.tool_call
            ),
            start_time=start_time,
            end_time=end_time,
            duration=(end_time - start_time).total_seconds(),
            token_usage=json.dumps(llm_data.token_usage),
            cost=json.dumps(llm_data.cost),
            memory_used=memory_used,
        )
        with self.Session() as session:
            session.add(llm_call)
            session.commit()

        self.trace_data["llm_calls"].append(
            {
                "name": name,
                "model": llm_data.model_name,
                "input_prompt": prompt,
                "output": llm_data.output_response,
                "tool_call": llm_data.tool_call,
                "start_time": start_time,
                "end_time": end_time,
                "duration": end_time - start_time,
                "token_usage": llm_data.token_usage,
                "cost": llm_data.cost,
                "memory_used": memory_used,
            }
        )
