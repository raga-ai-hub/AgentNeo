from ZODB import DB
from ZODB.FileStorage import FileStorage
import transaction
from BTrees.OOBTree import OOBTree
from datetime import datetime
import json
import ast

from ..data.data_models import Trace, Metric


from .metrics import (
    execute_goal_decomposition_efficiency_metric,
    execute_goal_fulfillment_metric,
    execute_tool_correctness_metric,
    execute_tool_call_success_rate_metric,
    execute_tool_selection_accuracy_metric,
    execute_tool_usage_efficiency_metric,
    execute_plan_adaptibility_metric,
)

from datetime import datetime


class Execution:
    def __init__(self, session, trace_id):
        self.user_session = session
        self.project_name = session.project_name
        self.trace_id = trace_id

        # Setup DB
        self.db_path = self.user_session.db_path
        self.storage = FileStorage(self.db_path)
        self.db = DB(self.storage)
        self.connection = self.db.open()
        self.root = self.connection.root()

        self.trace_data = self.get_trace_data()

    def execute(self, metric_list=[], config={}, metadata={}):
        for metric in metric_list:
            start_time = datetime.now()
            result = self._execute_metric(metric, config, metadata)
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            self._save_metric_result(metric, result, start_time, end_time, duration)

        transaction.commit()
        self.connection.close()

    def _execute_metric(self, metric, config, metadata):
        if metric == "goal_decomposition_efficiency":
            return execute_goal_decomposition_efficiency_metric(
                trace_json=self.trace_data,
                config=config,
                metadata=metadata,
            )
        elif metric == "goal_fulfillment_rate":
            return execute_goal_fulfillment_metric(
                trace_json=self.trace_data,
                config=config,
            )
        elif metric == "tool_correctness_metric":
            return execute_tool_correctness_metric(
                trace_json=self.trace_data,
                config=config,
            )
        elif metric == "tool_call_success_rate_metric":
            return execute_tool_call_success_rate_metric(
                trace_json=self.trace_data,
                config=config,
            )
        else:
            raise ValueError("provided metric name is not supported.")

    def _save_metric_result(self, metric, result, start_time, end_time, duration):
        trace = self.root["projects"][self.project_name].traces[self.trace_id]
        metric_id = len(trace.metrics) + 1
        metric_entry = Metric(metric_id, metric)
        metric_entry.score = result["result"]["score"]
        metric_entry.reason = result["result"]["reason"]
        metric_entry.result_detail = result
        metric_entry.config = result["config"]
        metric_entry.start_time = start_time
        metric_entry.end_time = end_time
        metric_entry.duration = duration
        trace.metrics[metric_id] = metric_entry

    def get_results(self):
        trace = self.root["projects"][self.project_name].traces[self.trace_id]
        results_list = []
        for metric in trace.metrics.values():
            result_dict = {
                "metric_name": metric.metric_name,
                "score": metric.score,
                "reason": metric.reason,
                "result_detail": dict(metric.result_detail),
                "config": dict(metric.config),
                "start_time": (
                    metric.start_time.isoformat() if metric.start_time else None
                ),
                "end_time": metric.end_time.isoformat() if metric.end_time else None,
                "duration": metric.duration,
            }
            results_list.append(result_dict)

        return results_list

    def get_trace_data(self):
        try:
            trace = self.root["projects"][self.project_name].traces[self.trace_id]
            return self.serialize_trace(trace)
        except KeyError:
            raise ValueError(f"No trace found with ID {self.trace_id}")
        except:
            raise ValueError("Unable to load the trace data.")

    def serialize_trace(self, trace):
        """Convert a Trace object into a dictionary, including all related objects."""
        return {
            "id": trace.id,
            "project_id": trace.id,  # Assuming project_id is the same as trace.id
            "start_time": trace.start_time.isoformat() if trace.start_time else None,
            "end_time": trace.end_time.isoformat() if trace.end_time else None,
            "duration": trace.duration,
            "project": self.project_name,
            "system_info": (
                {
                    "os_name": trace.system_info.os_name,
                    "os_version": trace.system_info.os_version,
                    "python_version": trace.system_info.python_version,
                    "cpu_info": trace.system_info.cpu_info,
                    "gpu_info": trace.system_info.gpu_info,
                    "disk_info": self.parse_json_field(trace.system_info.disk_info),
                    "memory_total": trace.system_info.memory_total,
                    "installed_packages": dict(trace.system_info.installed_packages),
                }
                if trace.system_info
                else None
            ),
            "agent_calls": [
                {
                    "id": agent_call.id,
                    "name": agent_call.name,
                    "start_time": (
                        agent_call.start_time.isoformat()
                        if agent_call.start_time
                        else None
                    ),
                    "end_time": (
                        agent_call.end_time.isoformat() if agent_call.end_time else None
                    ),
                    "llm_call_ids": list(agent_call.llm_calls.keys()),
                    "tool_call_ids": list(agent_call.tool_calls.keys()),
                    "user_interaction_ids": [
                        ui.id for ui in agent_call.user_interactions
                    ],
                }
                for agent_call in trace.agent_calls.values()
            ],
            "llm_calls": [
                {
                    "id": llm_call.id,
                    "name": llm_call.name,
                    "model": llm_call.model,
                    "input_prompt": dict(llm_call.input_prompt),
                    "output": dict(llm_call.output),
                    "tool_call": llm_call.tool_call,
                    "start_time": (
                        llm_call.start_time.isoformat() if llm_call.start_time else None
                    ),
                    "end_time": (
                        llm_call.end_time.isoformat() if llm_call.end_time else None
                    ),
                    "duration": llm_call.duration,
                    "token_usage": dict(llm_call.token_usage),
                    "cost": dict(llm_call.cost),
                    "memory_used": llm_call.memory_used,
                }
                for llm_call in trace.llm_calls.values()
            ],
            "tool_calls": [
                {
                    "id": tool_call.id,
                    "name": tool_call.name,
                    "input_parameters": dict(tool_call.input_parameters),
                    "output": dict(tool_call.output),
                    "start_time": (
                        tool_call.start_time.isoformat()
                        if tool_call.start_time
                        else None
                    ),
                    "end_time": (
                        tool_call.end_time.isoformat() if tool_call.end_time else None
                    ),
                    "duration": tool_call.duration,
                    "memory_used": tool_call.memory_used,
                    "network_calls": [
                        self.serialize_network_call(nc)
                        for nc in tool_call.network_calls
                    ],
                }
                for tool_call in trace.tool_calls.values()
            ],
            "errors": [
                {
                    "id": error.id,
                    "error_type": error.error_type,
                    "error_message": error.error_message,
                    "timestamp": (
                        error.timestamp.isoformat() if error.timestamp else None
                    ),
                }
                for error in trace.errors
            ],
            "user_interactions": [
                {
                    "id": interaction.id,
                    "interaction_type": interaction.type,
                    "content": interaction.content,
                    "timestamp": (
                        interaction.timestamp.isoformat()
                        if interaction.timestamp
                        else None
                    ),
                }
                for interaction in trace.user_interactions
            ],
        }

    def serialize_network_call(self, network_call):
        return {
            "timestamp": (
                network_call.timestamp.isoformat() if network_call.timestamp else None
            ),
            "request": dict(network_call.request),
            "response": dict(network_call.response),
        }

    def parse_json_field(self, field):
        """Parse a JSON string field into a Python object, if necessary."""
        if isinstance(field, str):
            try:
                return json.loads(field)
            except json.JSONDecodeError:
                try:
                    return ast.literal_eval(field)
                except:
                    return field
        elif isinstance(field, (list, dict)):
            return field
        return field

    def __del__(self):

        if hasattr(self, "connection"):
            self.connection.close()
