from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import SQLAlchemyError
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional
import json
import ast
import logging
from tqdm import tqdm
from dataclasses import dataclass
import traceback

from ..data import (
    ProjectInfoModel,
    TraceModel,
    MetricModel,
)

from .metrics import (
    execute_goal_decomposition_efficiency_metric,
    execute_goal_fulfillment_metric,
    execute_tool_call_correctness_rate,
    execute_tool_call_success_rate,
    execute_tool_selection_accuracy_metric,
    execute_tool_usage_efficiency_metric,
    execute_plan_adaptibility_metric,
)

from datetime import datetime

@dataclass
class EvaluationError:
    """Data class to store error information"""
    error_type: str
    error_message: str
    stack_trace: str
    timestamp: datetime
    evaluation_index: Optional[int] = None
    metric_name: Optional[str] = None

class ProgressTracker:
    """Handles progress tracking for nested parallel operations"""
    def __init__(self, total_evaluations: int, total_metrics: int):
        self.eval_progress = tqdm(total=total_evaluations, desc="Evaluations", position=0)
        self.metric_progress = tqdm(total=total_metrics, desc="Total Metrics", position=1)
        
    def update_evaluation(self):
        self.eval_progress.update(1)
        
    def update_metric(self):
        self.metric_progress.update(1)
        
    def close(self):
        self.eval_progress.close()
        self.metric_progress.close()


class Evaluation:
    def __init__(self, session, trace_id):
        self.user_session = session
        self.project_name = session.project_name
        self.trace_id = trace_id

        # Setup DB
        self.db_path = self.user_session.db_path
        self.engine = create_engine(self.db_path)
        self.session = Session(bind=self.engine)
        
        self.trace_data = self.get_trace_data()

        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Add file handler
        fh = logging.FileHandler('evaluator.log')
        fh.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        fh.setFormatter(formatter)
        self.logger.addHandler(fh)


    def _log_execution_summary(self, results: Dict):
            """Log detailed execution summary."""
            self.logger.info("=== Evaluation Execution Summary ===")
            self.logger.info(f"Total Evaluations: {results['total']}")
            self.logger.info(f"Successful Evaluations: {len(results['successful'])}")
            self.logger.info(f"Failed Evaluations: {len(results['failed'])}")
            self.logger.info(f"Success Rate: {results['success_rate']:.2f}%")
            self.logger.info(f"Total Execution Time: {results['execution_time']:.2f} seconds")
            self.logger.info(f"Total Metrics Completed: {results['statistics']['completed_metrics']}")
            self.logger.info(f"Total Metrics Failed: {results['statistics']['failed_metrics']}")
            
            if results['errors']:
                self.logger.info("\nError Summary:")
                for error in results['errors']:
                    self.logger.info(f"- {error['error_type']}: {error['error_message']}")
                    
    def evaluate(self, evaluations: List[Dict], max_eval_workers: int = 2, max_metric_workers: int = 2) -> Dict:
        """
        Run evaluations with double parallelization, enhanced progress tracking and error handling.
        
        Args:
            evaluations: List of dictionaries containing evaluation parameters:
                        [{"metric_list": [], "config": {}, "metadata": {}}]
            max_eval_workers: Maximum number of parallel evaluations
            max_metric_workers: Maximum number of parallel metrics per evaluation
            
        Returns:
            Dictionary containing results and error information
        """
        # Calculate total metrics for progress tracking
        total_metrics = sum(len(eval_params.get('metric_list', [])) 
                          for eval_params in evaluations)
        
        results = {
            'successful': [],
            'failed': [],
            'errors': [],
            'total': len(evaluations),
            'total_metrics': total_metrics,
            'success_rate': 0,
            'execution_time': 0,
            'statistics': {
                'completed_evaluations': 0,
                'completed_metrics': 0,
                'failed_evaluations': 0,
                'failed_metrics': 0
            }
        }
        
        batch_start_time = datetime.now()
        progress = ProgressTracker(len(evaluations), total_metrics)
        
        try:
            # Create a thread pool for evaluations
            with ThreadPoolExecutor(max_workers=max_eval_workers) as eval_executor:
                # Submit all evaluation tasks
                future_to_eval = {
                    eval_executor.submit(
                        self._execute_parallel_metrics,
                        eval_params,
                        max_metric_workers,
                        progress
                    ): i for i, eval_params in enumerate(evaluations)
                }
                
                for future in as_completed(future_to_eval):
                    eval_index = future_to_eval[future]
                    try:
                        eval_result = future.result()
                        results['successful'].append({
                            'index': eval_index,
                            'result': eval_result
                        })
                        results['statistics']['completed_evaluations'] += 1
                        results['statistics']['completed_metrics'] += len(
                            evaluations[eval_index].get('metric_list', [])
                        )
                    except Exception as e:
                        error_info = EvaluationError(
                            error_type=type(e).__name__,
                            error_message=str(e),
                            stack_trace=traceback.format_exc(),
                            timestamp=datetime.now(),
                            evaluation_index=eval_index
                        )
                        
                        results['failed'].append({
                            'index': eval_index,
                            'error': str(e),
                            'evaluation_params': evaluations[eval_index]
                        })
                        results['errors'].append(vars(error_info))
                        results['statistics']['failed_evaluations'] += 1
                        
                        self.logger.error(
                            f"Evaluation {eval_index} failed: {str(e)}\n"
                            f"Stack trace: {error_info.stack_trace}"
                        )
                    finally:
                        progress.update_evaluation()
        
        except Exception as e:
            error_info = EvaluationError(
                error_type=type(e).__name__,
                error_message=str(e),
                stack_trace=traceback.format_exc(),
                timestamp=datetime.now()
            )
            results['errors'].append(vars(error_info))
            self.logger.error(f"Global evaluation failure: {str(e)}\nStack trace: {error_info.stack_trace}")
            raise RuntimeError(f"Global evaluation failure: {str(e)}")
        
        finally:
            progress.close()
            batch_end_time = datetime.now()
            results['execution_time'] = (batch_end_time - batch_start_time).total_seconds()
            
            if results['total'] > 0:
                results['success_rate'] = (
                    len(results['successful']) / results['total'] * 100
                )
            
            # Log detailed summary
            self._log_execution_summary(results)
        
        return results

    def _execute_parallel_metrics(self, eval_params: Dict, max_metric_workers: int, 
                                progress: ProgressTracker) -> Dict:
        """Execute metrics in parallel for a single evaluation with enhanced error handling."""
        start_time = datetime.now()
        metric_results = []
        metric_errors = []
        
        try:
            with ThreadPoolExecutor(max_workers=max_metric_workers) as metric_executor:
                future_to_metric = {
                    metric_executor.submit(
                        self._execute_single_metric,
                        metric,
                        eval_params.get('config', {}),
                        eval_params.get('metadata', {}),
                        start_time
                    ): metric for metric in eval_params.get('metric_list', [])
                }
                
                for future in as_completed(future_to_metric):
                    metric = future_to_metric[future]
                    try:
                        metric_result = future.result()
                        metric_results.append(metric_result)
                    except Exception as e:
                        error_info = EvaluationError(
                            error_type=type(e).__name__,
                            error_message=str(e),
                            stack_trace=traceback.format_exc(),
                            timestamp=datetime.now(),
                            metric_name=metric
                        )
                        metric_errors.append(vars(error_info))
                        self.logger.error(
                            f"Metric {metric} failed: {str(e)}\n"
                            f"Stack trace: {error_info.stack_trace}"
                        )
                    finally:
                        progress.update_metric()
            
            if metric_errors:
                self.session.rollback()
                raise RuntimeError(f"Some metrics failed: {len(metric_errors)} errors occurred")
            
            self.session.commit()
            return {
                'status': 'success',
                'metric_results': metric_results,
                'total_duration': (datetime.now() - start_time).total_seconds(),
                'errors': metric_errors
            }
            
        except Exception as e:
            self.session.rollback()
            raise RuntimeError(f"Evaluation failed: {str(e)}")

    def _execute_single_metric(self, metric: str, config: Dict, metadata: Dict, 
                             start_time: datetime) -> Dict:
        """Execute a single metric with timing and result saving."""
        try:
            metric_result = self._execute_metric(metric, config, metadata)
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Save metric result to database
            self._save_metric_result(
                metric=metric,
                result=metric_result,
                start_time=start_time,
                end_time=end_time,
                duration=duration
            )
            
            return {
                'metric': metric,
                'result': metric_result,
                'duration': duration,
                'timestamp': end_time
            }
            
        except Exception as e:
            raise RuntimeError(f"Metric execution failed: {str(e)}")

    def _execute_metric(self, metric, config, metadata):
        if metric == 'goal_decomposition_efficiency':
            return execute_goal_decomposition_efficiency_metric(
                trace_json=self.trace_data,
                config=config,
                metadata=metadata,
            )
        elif metric == 'goal_fulfillment_rate':
            return execute_goal_fulfillment_metric(
                trace_json=self.trace_data,
                config=config,
            )
        elif metric == 'tool_call_correctness_rate':
            return execute_tool_call_correctness_rate(
                trace_json=self.trace_data,
                config=config,
            )
        elif metric == 'tool_call_success_rate':
            return execute_tool_call_success_rate(
                trace_json=self.trace_data,
                config=config,
            )
        else:
            raise ValueError("provided metric name is not supported.")
        

    def _save_metric_result(self, metric, result, start_time, end_time, duration):
        metric_entry = MetricModel(
            trace_id=self.trace_id,
            metric_name=metric,
            score = result['result']['score'],
            reason = result['result']['reason'],
            result_detail = result,
            config = result['config'],
            start_time=start_time,
            end_time=end_time,
            duration=duration
        )
        self.session.add(metric_entry)

    def get_results(self):
        results = self.session.query(MetricModel).filter_by(trace_id=self.trace_id).all()
        results_list = []
        for result in results:
            result_dict = {
                'metric_name': result.metric_name,
                'score' : result.score,
                'reason' : result.reason,
                'result_detail': result.result_detail,
                'config' : result.config,
                'start_time': result.start_time.isoformat() if result.start_time else None,
                'end_time': result.end_time.isoformat() if result.end_time else None,
                'duration': result.duration
            }
            results_list.append(result_dict)
        
        return results_list

    def get_trace_data(self):
        try:
            # Query the trace with the specific ID
            trace = self.session.query(TraceModel).filter_by(id=self.trace_id).one_or_none()

            json_data = []
            if trace:
                # Serialize the trace and write it as JSON
                trace_dict = self.serialize_trace(trace)
                json_data.append(trace_dict)  # Store the trace dictionary
            else:
                raise ValueError(f"No trace found with ID {self.trace_id}")
            
            return json_data[0]

        except:
            raise ValueError("Unable to load the trace data.")


    def serialize_trace(self, trace):
        """Convert a TraceModel object into a dictionary, including all related objects."""
        return {
            'id': trace.id,
            'project_id': trace.project_id,
            'start_time': trace.start_time.isoformat() if trace.start_time else None,
            'end_time': trace.end_time.isoformat() if trace.end_time else None,
            'duration': trace.duration,
            'project': trace.project.project_name if trace.project else None,
            'system_info': {
                'os_name': trace.system_info.os_name,
                'os_version': trace.system_info.os_version,
                'python_version': trace.system_info.python_version,
                'cpu_info': trace.system_info.cpu_info,
                'gpu_info': trace.system_info.gpu_info,
                'disk_info': self.parse_json_field(trace.system_info.disk_info),
                'memory_total': trace.system_info.memory_total,
                'installed_packages': self.parse_json_field(trace.system_info.installed_packages)
            } if trace.system_info else None,
            'agent_calls': [
                {
                    'id': agent_call.id,
                    'name': agent_call.name,
                    # 'input_parameters': self.parse_json_field(agent_call.input_parameters),
                    # 'output': self.parse_json_field(agent_call.output),
                    'start_time': agent_call.start_time.isoformat() if agent_call.start_time else None,
                    'end_time': agent_call.end_time.isoformat() if agent_call.end_time else None,
                    # 'duration': agent_call.duration,
                    # 'memory_used': agent_call.memory_used
                    'llm_call_ids': self.parse_json_field(agent_call.llm_call_ids),
                    'tool_call_ids': self.parse_json_field(agent_call.tool_call_ids),
                    'user_interaction_ids': self.parse_json_field(agent_call.user_interaction_ids),
                } for agent_call in trace.agent_calls
            ],
            'llm_calls': [
                {
                    'id': llm_call.id,
                    'name': llm_call.name,
                    'model': llm_call.model,
                    'input_prompt': self.parse_json_field(llm_call.input_prompt),
                    'output': self.parse_json_field(llm_call.output),
                    'tool_call': self.parse_json_field(llm_call.tool_call),
                    'start_time': llm_call.start_time.isoformat() if llm_call.start_time else None,
                    'end_time': llm_call.end_time.isoformat() if llm_call.end_time else None,
                    'duration': llm_call.duration,
                    'token_usage': self.parse_json_field(llm_call.token_usage),
                    'cost': self.parse_json_field(llm_call.cost),
                    'memory_used': llm_call.memory_used
                } for llm_call in trace.llm_calls
            ],
            'tool_calls': [
                {
                    'id': tool_call.id,
                    'name': tool_call.name,
                    'input_parameters': self.parse_json_field(tool_call.input_parameters),
                    'output': self.parse_json_field(tool_call.output),
                    'start_time': tool_call.start_time.isoformat() if tool_call.start_time else None,
                    'end_time': tool_call.end_time.isoformat() if tool_call.end_time else None,
                    'duration': tool_call.duration,
                    'memory_used': tool_call.memory_used,
                    'network_calls': self.parse_json_field(tool_call.network_calls)
                } for tool_call in trace.tool_calls
            ],
            'errors': [
                {
                    'id': error.id,
                    'error_type': error.error_type,
                    'error_message': error.error_message,
                    'timestamp': error.timestamp.isoformat() if error.timestamp else None
                } for error in trace.errors
            ],
            'user_interactions': [
                {
                    'id': interaction.id,
                    'interaction_type': interaction.interaction_type,
                    'content': interaction.content,
                    'timestamp': interaction.timestamp.isoformat() if interaction.timestamp else None
                } for interaction in trace.user_interactions
            ]
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
