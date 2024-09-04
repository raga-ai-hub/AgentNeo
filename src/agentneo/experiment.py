from .agent_neo import AgentNeo
from typing import List, Dict, Any


class Experiment:
    def __init__(
        self,
        session: AgentNeo,
        experiment_name: str,
        description: str,
        project_id: int,
        dataset_id: int,
    ):
        self.session = session
        self.experiment_name = experiment_name
        self.description = description
        self.project_id = project_id
        self.dataset_id = dataset_id

        self.experiment_id = None  # Will be set after creation

    def create(self) -> Dict[str, Any]:
        response = self.session._make_request(
            "POST",
            "experiments/execute_experiment",
            data={
                "project_id": self.project_id,
                "dataset_id": self.dataset_id,
                "name": self.experiment_name,
                "description": self.description,
                "metrics": [],  # Initially create without metrics
            },
        )
        self.experiment_id = response.get("id")
        return response

    def execute(self, metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
        try:
            response = self.session._make_request(
                "POST",
                "experiments/execute_experiment",
                data={
                    "name": self.experiment_name,
                    "project_id": self.project_id,
                    "dataset_id": self.dataset_id,
                    "metrics": metrics,
                },
            )
            return response
        except Exception as e:
            print(f"An error occurred while executing the experiment: {str(e)}")
            return {"error": str(e)}

    def get_results(self, experiment_id: int) -> Dict[str, Any]:
        return self.session._make_request(
            "GET", f"experiments/get_experiment_results?id={experiment_id}"
        )

    @classmethod
    def list_experiments(cls, session: AgentNeo) -> List[Dict[str, Any]]:
        experiments = session._make_request("GET", "experiments/get_experiments")
        if not experiments:
            print("No experiments available.")
            return
        print("Available experiments:")
        for experiment in experiments:
            print(f"- {experiment['name']}")
        return
