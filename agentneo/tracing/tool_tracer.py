import asyncio
import psutil
import json
import functools
from datetime import datetime
from .network_tracer import NetworkTracer, patch_aiohttp_trace_config
from .user_interaction_tracer import UserInteractionTracer
from .tool import Tool
from ..data import ToolCallModel


class ToolTracerMixin:
    def trace_tool(self, name: str, description: str = ""):
        def decorator(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                self.network_tracer.activate_patches()  # Activate patches before execution
                return await self._trace_tool_call_async(
                    func, name, description, *args, **kwargs
                )

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                self.network_tracer.activate_patches()  # Activate patches before execution
                return self._trace_tool_call_sync(
                    func, name, description, *args, **kwargs
                )

            return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

        return decorator

    async def _trace_tool_call_async(self, func, name, description, *args, **kwargs):
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss
        agent_id = self.current_agent_id.get()

        # Initialize the UserInteractionTracer
        user_interaction_tracer = UserInteractionTracer(self)

        try:
            async with user_interaction_tracer.async_capture():
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
                agent_id=agent_id,  # Associate with agent if any
                name=name,
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
                tool_call_id = tool_call.id

            # Append tool_call_id to current_tool_call_ids if available
            tool_call_ids = self.current_tool_call_ids.get(None)
            if tool_call_ids is not None:
                tool_call_ids.append(tool_call_id)

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
                "agent_id": agent_id,
                "tool_call_id": tool_call_id,
            }

            self.trace_data["tool_calls"].append(tool_call_data)

            return result
        except Exception as e:
            self._log_error(e, "tool", name)
            raise
        finally:
            self.network_tracer.deactivate_patches()  # Deactivate patches after execution

    def _trace_tool_call_sync(self, func, name, description, *args, **kwargs):
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss
        agent_id = self.current_agent_id.get()

        # Initialize the UserInteractionTracer
        user_interaction_tracer = UserInteractionTracer(self)

        try:
            with user_interaction_tracer.capture():
                result = func(*args, **kwargs)

            end_time = datetime.now()
            end_memory = psutil.Process().memory_info().rss
            memory_used = end_memory - start_memory

            tool_call = ToolCallModel(
                project_id=self.project_id,
                trace_id=self.trace_id,
                agent_id=agent_id,  # Associate with agent if any
                name=name,
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
                tool_call_id = tool_call.id

            # Append tool_call_id to current_tool_call_ids if available
            tool_call_ids = self.current_tool_call_ids.get(None)
            if tool_call_ids is not None:
                tool_call_ids.append(tool_call_id)

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
                "agent_id": agent_id,
                "tool_call_id": tool_call_id,
            }

            self.trace_data["tool_calls"].append(tool_call_data)

            return result
        except Exception as e:
            self._log_error(e, "tool", name)
            raise
        finally:
            self.network_tracer.deactivate_patches()  # Deactivate patches after execution
