import asyncio
import psutil
import asyncio
import psutil
import json
import wrapt
import functools
from datetime import datetime
import os

from .utils import load_model_costs
from .llm_utils import extract_llm_output
from ..data.data_models import LLMCall, Error

import transaction
from persistent import Persistent
from BTrees.OOBTree import OOBTree

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class LLMTracerMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.patches = []
        self.model_costs = load_model_costs()

    def instrument_llm_calls(self):
        # Use wrapt to register post-import hooks
        wrapt.register_post_import_hook(self.patch_openai_methods, "openai")
        wrapt.register_post_import_hook(self.patch_litellm_methods, "litellm")

    def patch_openai_methods(self, module):
        if hasattr(module, "OpenAI"):
            client_class = getattr(module, "OpenAI")
            self.wrap_openai_client_methods(client_class)
        if hasattr(module, "AsyncOpenAI"):
            async_client_class = getattr(module, "AsyncOpenAI")
            self.wrap_openai_client_methods(async_client_class)

    def wrap_openai_client_methods(self, client_class):
        original_init = client_class.__init__

        @functools.wraps(original_init)
        def patched_init(client_self, *args, **kwargs):
            original_init(client_self, *args, **kwargs)
            self.wrap_method(client_self.chat.completions, "create")
            if hasattr(client_self.chat.completions, "acreate"):
                self.wrap_method(client_self.chat.completions, "acreate")

        setattr(client_class, "__init__", patched_init)

    def patch_litellm_methods(self, module):
        # Wrap methods in litellm
        self.wrap_method(module, "completion")
        self.wrap_method(module, "acompletion")

    def wrap_method(self, obj, method_name):
        original_method = getattr(obj, method_name)

        @wrapt.decorator
        def wrapper(wrapped, instance, args, kwargs):
            return self.trace_llm_call(wrapped, *args, **kwargs)

        wrapped_method = wrapper(original_method)
        setattr(obj, method_name, wrapped_method)
        self.patches.append((obj, method_name, original_method))

    def trace_llm_call(self, original_func, *args, **kwargs):
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss

        agent_id = self.get_current_agent_id()
        llm_call_name = self.get_current_llm_call_name() or original_func.__name__

        try:
            result = original_func(*args, **kwargs)

            end_time = datetime.now()
            end_memory = psutil.Process().memory_info().rss
            memory_used = max(0, end_memory - start_memory)

            sanitized_args = self._sanitize_api_keys(args)
            sanitized_kwargs = self._sanitize_api_keys(kwargs)

            model_name = self._extract_model_name(sanitized_kwargs)
            try:
                model = (
                    os.path.join("groq", model_name) if result.x_groq else model_name
                )
            except:
                model = model_name

            llm_call = self.process_llm_result(
                result,
                llm_call_name,
                model,
                self._extract_input(sanitized_args, sanitized_kwargs),
                start_time,
                end_time,
                memory_used,
                agent_id,
            )

            # Append llm_call_id to current_llm_call_ids
            llm_call_ids = self.get_current_llm_call_ids()
            if llm_call_ids is None:
                llm_call_ids = []
            llm_call_ids.append(llm_call.id)
            self.set_current_llm_call_ids(llm_call_ids)

            return result
        except Exception as e:
            self._log_error(e, "llm", llm_call_name)
            raise

    def process_llm_result(
        self, result, name, model, prompt, start_time, end_time, memory_used, agent_id
    ):
        llm_data = extract_llm_output(result)

        token_usage = {"input": 0, "completion": 0, "reasoning": 0}

        if hasattr(result, "usage"):
            usage = result.usage
            token_usage["input"] = getattr(usage, "prompt_tokens", 0)
            token_usage["completion"] = getattr(usage, "completion_tokens", 0)
            token_usage["reasoning"] = getattr(usage, "reasoning_tokens", 0)

        # Default cost values if the model or default is not found
        default_cost = {"input": 0.0, "output": 0.0, "reasoning": 0.0}

        # Try to get the model-specific cost, fall back to default, then to default_cost
        model_cost = self.model_costs.get(
            model, self.model_costs.get("default", default_cost)
        )

        cost = {
            "input": token_usage["input"] * model_cost["input_cost_per_token"],
            "output": token_usage["completion"] * model_cost["output_cost_per_token"],
            "reasoning": token_usage["reasoning"]
            * model_cost.get("reasoning_cost_per_token", 0),
        }

        llm_call_id = len(self.current_trace.llm_calls) + 1
        llm_call = LLMCall(llm_call_id, agent_id, name, model)
        llm_call.input_prompt = {"prompt": str(prompt)}
        llm_call.output_text = {"text": str(llm_data["output_text"])}
        llm_call.output = {"response": str(llm_data["response"])}
        llm_call.tool_call = str(llm_data[""]) if llm_data["tool_call"] else ""
        llm_call.start_time = start_time
        llm_call.end_time = end_time
        llm_call.duration = (end_time - start_time).total_seconds()
        llm_call.token_usage = token_usage
        llm_call.cost = cost
        llm_call.memory_used = memory_used

        self.current_trace.llm_calls[llm_call_id] = llm_call
        transaction.commit()

        # Create a dictionary with all the necessary information
        llm_call_data = {
            "id": llm_call.id,
            "name": name,
            "model": model,
            "input_prompt": prompt,
            "response": llm_data["response"],
            "tool_call": llm_data["tool_call"],
            "start_time": start_time,
            "end_time": end_time,
            "duration": (end_time - start_time).total_seconds(),
            "token_usage": token_usage,
            "cost": cost,
            "memory_used": memory_used,
            "agent_id": agent_id,
        }

        if agent_id:
            agent_call = self.current_trace.agent_calls.get(agent_id)
            if agent_call:
                agent_call.llm_calls[llm_call_id] = llm_call
                transaction.commit()

        # Append the data to trace_data
        self.trace_data.setdefault("llm_calls", []).append(llm_call_data)

        return llm_call

    def _log_error(self, exception, error_type, name):
        error_id = len(getattr(self.current_trace, "errors", [])) + 1
        error = Error(error_id, error_type, str(exception), "")
        if not hasattr(self.current_trace, "errors"):
            self.current_trace.errors = []
        self.current_trace.errors.append(error)
        transaction.commit()
        logger.error(f"Error in {error_type} {name}: {str(exception)}")

    def _extract_model_name(self, kwargs):
        return kwargs.get("model", "unknown")

    def _extract_input(self, args, kwargs):
        if "prompt" in kwargs:
            return kwargs["prompt"]
        elif "messages" in kwargs:
            return kwargs["messages"]
        else:
            return args[0] if args else ""

    def _sanitize_api_keys(self, data):
        # Implement sanitization logic to remove API keys from data
        return data

    def unpatch_llm_calls(self):
        for obj, method_name, original_method in self.patches:
            setattr(obj, method_name, original_method)
        self.patches.clear()

    def trace_llm(self, name: str):
        def decorator(func_or_class):
            if isinstance(func_or_class, type):
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
                    previous_name = self.get_current_llm_call_name()
                    self.set_current_llm_call_name(name)
                    try:
                        return await func_or_class(*args, **kwargs)
                    finally:
                        self.set_current_llm_call_name(previous_name)

                @functools.wraps(func_or_class)
                def sync_wrapper(*args, **kwargs):
                    previous_name = self.get_current_llm_call_name()
                    self.set_current_llm_call_name(name)
                    try:
                        return func_or_class(*args, **kwargs)
                    finally:
                        self.set_current_llm_call_name(previous_name)

                return (
                    async_wrapper
                    if asyncio.iscoroutinefunction(func_or_class)
                    else sync_wrapper
                )

        return decorator
