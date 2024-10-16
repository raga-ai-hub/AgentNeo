import contextvars
from typing import Optional, Dict

from .base import BaseTracer
from .llm_tracer import LLMTracerMixin
from .tool_tracer import ToolTracerMixin
from .agent_tracer import AgentTracerMixin
from .network_tracer import NetworkTracer

import threading
from ZODB import DB
from ZODB.FileStorage import FileStorage
import transaction
from BTrees.OOBTree import OOBTree


class Tracer(LLMTracerMixin, ToolTracerMixin, AgentTracerMixin, BaseTracer):
    def __init__(
        self,
        session,
        auto_instrument_llm: bool = True,
    ):
        super().__init__(session)
        self.auto_instrument_llm = auto_instrument_llm
        self.tools = OOBTree()
        self.call_depth = contextvars.ContextVar("call_depth", default=0)
        self.network_tracer = NetworkTracer()
        self.current_agent_id = threading.local()
        self.current_llm_call_name = threading.local()
        self.current_tool_call_ids = threading.local()
        self.current_llm_call_ids = threading.local()

    def start(self):
        # Start base tracer
        super().start()
        # Set the current_trace attribute
        self.current_trace = self.trace
        # Instrument calls from mixins
        if self.auto_instrument_llm:
            self.instrument_llm_calls()

        # Start a new transaction
        transaction.begin()

    def stop(self):
        # Unpatch methods from mixins
        self.unpatch_llm_calls()

        # Stop base tracer
        super().stop()

        # Commit the transaction
        transaction.commit()

    # If you need an unpatch_methods method
    def unpatch_methods(self):
        # Unpatch methods from all mixins
        self.unpatch_llm_calls()
