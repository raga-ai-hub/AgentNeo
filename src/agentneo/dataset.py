from .agent_neo import AgentNeo
from typing import Optional, Dict, List, Any


class Dataset:
    def __init__(
        self, session: AgentNeo, dataset_name: str, description: str, project_id: int
    ):
        self.session = session
        self.dataset_name = dataset_name
        self.description = description
        self.project_id = project_id

    def from_trace(
        self, trace_id: str, trace_filter: Optional[Dict] = None
    ) -> Dict[str, Any]:
        return self.session._make_request(
            "POST",
            "datasets/dataset_from_trace",
            data={
                "name": self.dataset_name,
                "description": self.description,
                "project_id": self.project_id,
                "trace_id": trace_id,
                "trace_filter": trace_filter,
            },
        )

    def from_json(
        self, json_filepath: str, schema: Optional[Dict] = None
    ) -> Dict[str, Any]:
        return self.session._make_request(
            "POST",
            "datasets/dataset_from_json",
            data={
                "name": self.dataset_name,
                "description": self.description,
                "project_id": self.project_id,
                "filepath": json_filepath,
                "schema": schema,
            },
        )

    @classmethod
    def list_datasets(cls, session: AgentNeo) -> List[Dict[str, Any]]:
        datasets = session._make_request("GET", "datasets/get_datasets")
        if not datasets:
            print("No datasets available.")
            return
        print("Available datasets:")
        for dataset in datasets:
            print(f"- {dataset['name']}")
        return
