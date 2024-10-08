import asyncio
import psutil
import json
import functools
from datetime import datetime
from .user_interaction_tracer import UserInteractionTracer
from ..data import AgentCallModel


class AgentTracerMixin:
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

                @functools.wraps(func_or_class)
                async def async_wrapper(*args, **kwargs):
                    return await self._trace_agent_call_async(
                        func_or_class, name, *args, **kwargs
                    )

                @functools.wraps(func_or_class)
                def sync_wrapper(*args, **kwargs):
                    return self._trace_agent_call_sync(
                        func_or_class, name, *args, **kwargs
                    )

                return (
                    async_wrapper
                    if asyncio.iscoroutinefunction(func_or_class)
                    else sync_wrapper
                )

        return decorator

    def _trace_agent_call_sync(self, func, name, *args, **kwargs):
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss

        # Create the agent call record first
        agent_call = AgentCallModel(
            project_id=self.project_id,
            trace_id=self.trace_id,
            name=name,
            input_parameters=json.dumps({k: str(v) for k, v in kwargs.items()}),
            output="",
            start_time=start_time,
            end_time=None,
            duration=None,
            memory_used=0,
        )
        with self.Session() as session:
            session.add(agent_call)
            session.commit()
            agent_id = agent_call.id

        # Store current agent_id in context variable
        token_agent = self.current_agent_id.set(agent_id)
        # Initialize lists to collect LLM and tool call IDs
        token_llm = self.current_llm_call_ids.set([])
        token_tool = self.current_tool_call_ids.set([])

        # Initialize the UserInteractionTracer
        user_interaction_tracer = UserInteractionTracer(self)

        try:
            with user_interaction_tracer.capture():
                result = func(*args, **kwargs)

            end_time = datetime.now()
            end_memory = psutil.Process().memory_info().rss
            memory_used = max(0, end_memory - start_memory)

            # Retrieve collected LLM and tool call IDs
            llm_call_ids = self.current_llm_call_ids.get()
            tool_call_ids = self.current_tool_call_ids.get()

            # Update the agent call record
            with self.Session() as session:
                agent_call = session.query(AgentCallModel).get(agent_id)
                agent_call.output = str(result)
                agent_call.end_time = end_time
                agent_call.duration = (end_time - start_time).total_seconds()
                agent_call.memory_used = memory_used
                # Store LLM and tool call IDs as JSON strings
                agent_call.llm_call_ids = json.dumps(llm_call_ids)
                agent_call.tool_call_ids = json.dumps(tool_call_ids)
                session.commit()

            self.trace_data.setdefault("agent_calls", []).append(
                {
                    "id": agent_id,
                    "name": name,
                    "input_parameters": kwargs,
                    "output": str(result),
                    "start_time": start_time,
                    "end_time": end_time,
                    "duration": (end_time - start_time).total_seconds(),
                    "memory_used": memory_used,
                    "llm_call_ids": llm_call_ids,
                    "tool_call_ids": tool_call_ids,
                }
            )
        except Exception as e:
            self._log_error(e, "agent", name, agent_id)
            raise
        finally:
            # Reset the context variables
            self.current_agent_id.reset(token_agent)
            self.current_llm_call_ids.reset(token_llm)
            self.current_tool_call_ids.reset(token_tool)

        return result

    async def _trace_agent_call_async(self, func, name, *args, **kwargs):
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss

        # Create the agent call record first
        agent_call = AgentCallModel(
            project_id=self.project_id,
            trace_id=self.trace_id,
            name=name,
            input_parameters=json.dumps({k: str(v) for k, v in kwargs.items()}),
            output="",
            start_time=start_time,
            end_time=None,
            duration=None,
            memory_used=0,
        )
        with self.Session() as session:
            session.add(agent_call)
            session.commit()
            agent_id = agent_call.id

        # Store current agent_id in context variable
        token_agent = self.current_agent_id.set(agent_id)
        # Initialize lists to collect LLM and tool call IDs
        token_llm = self.current_llm_call_ids.set([])
        token_tool = self.current_tool_call_ids.set([])

        # Initialize the UserInteractionTracer
        user_interaction_tracer = UserInteractionTracer(self)

        try:
            async with user_interaction_tracer.async_capture():
                result = await func(*args, **kwargs)

            end_time = datetime.now()
            end_memory = psutil.Process().memory_info().rss
            memory_used = max(0, end_memory - start_memory)  # Ensure non-negative value

            # Retrieve collected LLM and tool call IDs
            llm_call_ids = self.current_llm_call_ids.get()
            tool_call_ids = self.current_tool_call_ids.get()

            # Update the agent call record
            with self.Session() as session:
                agent_call = session.query(AgentCallModel).get(agent_id)
                agent_call.output = str(result)
                agent_call.end_time = end_time
                agent_call.duration = (end_time - start_time).total_seconds()
                agent_call.memory_used = memory_used
                # Store LLM and tool call IDs as JSON strings
                agent_call.llm_call_ids = json.dumps(llm_call_ids)
                agent_call.tool_call_ids = json.dumps(tool_call_ids)
                session.commit()

            self.trace_data.setdefault("agent_calls", []).append(
                {
                    "id": agent_id,
                    "name": name,
                    "input_parameters": kwargs,
                    "output": str(result),
                    "start_time": start_time,
                    "end_time": end_time,
                    "duration": (end_time - start_time).total_seconds(),
                    "memory_used": memory_used,
                    "llm_call_ids": llm_call_ids,
                    "tool_call_ids": tool_call_ids,
                }
            )
        except Exception as e:
            self._log_error(e, "agent", name, agent_id)
            raise
        finally:
            # Reset the context variables
            self.current_agent_id.reset(token_agent)
            self.current_llm_call_ids.reset(token_llm)
            self.current_tool_call_ids.reset(token_tool)

        return result
