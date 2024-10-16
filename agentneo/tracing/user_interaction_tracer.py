import builtins
from contextlib import contextmanager, asynccontextmanager
from datetime import datetime

from ..data.data_models import UserInteraction

import transaction
from persistent import Persistent
from BTrees.OOBTree import OOBTree


class UserInteractionTracer:
    def __init__(self, tracer):
        self.tracer = tracer
        self.original_input = builtins.input
        self.original_print = builtins.print

    def input(self, prompt=""):
        content = prompt
        user_input = self.original_input(prompt)
        self._log_interaction("input", user_input)
        return user_input

    def print(self, *args, **kwargs):
        content = " ".join(str(arg) for arg in args)
        self._log_interaction("output", content)
        self.original_print(*args, **kwargs)

    def _log_interaction(self, interaction_type, content):
        agent_id = self.tracer.current_agent_id.get()
        user_interaction = UserInteraction(interaction_type, content)

        if agent_id:
            agent_call = self.tracer.trace.agent_calls.get(agent_id)
            if agent_call:
                agent_call.user_interactions.append(user_interaction)
        else:
            self.tracer.trace.user_interactions.append(user_interaction)

        transaction.commit()

        # Also add to trace data
        self.tracer.trace_data.setdefault("user_interactions", []).append(
            {
                "interaction_type": interaction_type,
                "content": content,
                "timestamp": user_interaction.timestamp,
                "agent_id": agent_id,
            }
        )

    @contextmanager
    def capture(self):
        builtins.input = self.input
        builtins.print = self.print
        try:
            yield
        finally:
            builtins.input = self.original_input
            builtins.print = self.original_print

    @asynccontextmanager
    async def async_capture(self):
        builtins.input = self.input
        builtins.print = self.print
        try:
            yield
        finally:
            builtins.input = self.original_input
            builtins.print = self.original_print
