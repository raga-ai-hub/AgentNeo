import requests
from typing import Optional, Dict, List, Any


BASE_URL = "http://74.249.60.46:5000"


class AgentNeo:
    def __init__(
        self, access_key: str, secret_key: str, base_url: Optional[str] = None
    ):
        self.access_key = access_key
        self.secret_key = secret_key
        self.base_url = base_url or BASE_URL
        self.token = None

    def authenticate(self):
        response = requests.post(
            f"{self.base_url}/auth/authenticate",
            json={"access_key": self.access_key, "secret_key": self.secret_key},
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            return True
        return False

    def _check_authentication(self):
        if not self.token:
            return self.authenticate()
        return True

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        files: Optional[Dict] = None,
    ):
        if not self._check_authentication():
            raise Exception("Authentication failed")

        headers = {"Authorization": f"Bearer {self.token}"}
        url = f"{self.base_url}/{endpoint}"

        if method == "GET":
            response = requests.get(url, headers=headers, params=data)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, files=files)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        if response.status_code in (200, 201):
            return response.json()
        else:
            raise Exception(f"Request failed: {response.json()}")

    def list_projects(self) -> List[Dict[str, Any]]:
        projects = self._make_request("GET", "projects/get_projects")
        if not projects:
            print("No projects available.")
            return
        print("Available projects:")
        for project in projects:
            print(f"- {project['name']}")
        return

    def create_project(self, name: str, description: str) -> Dict[str, Any]:
        response = self._make_request(
            "POST",
            "projects/create_project",
            data={"name": name, "description": description},
        )
        if "id" in response:
            print(f"Project '{name}' created successfully with ID: {response['id']}")
        else:
            print(f"Failed to create project '{name}'. Response: {response}")
        return response

    # def list_datasets(self) -> List[Dict[str, Any]]:
    #     datasets = self._make_request("GET", "datasets/get_datasets")
    #     if not datasets:
    #         print("No datasets available.")
    #         return
    #     print("Available datasets:")
    #     for dataset in datasets:
    #         print(f"- {dataset['name']}")
    #     return

    # def create_dataset_from_trace(
    #     self,
    #     name: str,
    #     description: str,
    #     project_id: int,
    #     trace_id: str,
    #     trace_filter: Optional[Dict] = None,
    # ) -> Dict[str, Any]:
    #     return self._make_request(
    #         "POST",
    #         "datasets/dataset_from_trace",
    #         data={
    #             "name": name,
    #             "description": description,
    #             "project_id": project_id,
    #             "trace_id": trace_id,
    #             "trace_filter": trace_filter,
    #         },
    #     )

    # def create_dataset_from_json(
    #     self, name: str, description: str, project_id: int, filepath: str
    # ) -> Dict[str, Any]:
    #     return self._make_request(
    #         "POST",
    #         "datasets/dataset_from_json",
    #         data={
    #             "name": name,
    #             "description": description,
    #             "project_id": project_id,
    #             "filepath": filepath,
    #         },
    #     )

    # def list_experiments(self) -> List[Dict[str, Any]]:
    #     experiments = self._make_request("GET", "experiments/get_experiments")
    #     if not experiments:
    #         print("No experiments available.")
    #         return
    #     print("Available experiments:")
    #     for experiment in experiments:
    #         print(f"- {experiment['name']}")
    #     return

    # def execute_experiment(
    #     self,
    #     project_id: int,
    #     dataset_id: int,
    #     name: str,
    #     description: str,
    #     metrics: List[Dict[str, Any]],
    # ) -> Dict[str, Any]:
    #     return self._make_request(
    #         "POST",
    #         "experiments/execute_experiment",
    #         data={
    #             "project_id": project_id,
    #             "dataset_id": dataset_id,
    #             "name": name,
    #             "description": description,
    #             "metrics": metrics,
    #         },
    #     )

    # def get_experiment_results(self, experiment_id: int) -> Dict[str, Any]:
    #     return self._make_request(
    #         "GET", f"experiments/get_experiment_results?id={experiment_id}"
    #     )

    def log_trace(self, trace_file_path: str) -> Dict[str, Any]:
        with open(trace_file_path, "rb") as trace_file:
            return self._make_request(
                "POST",
                "trace/log_trace",
                files={"trace_file": trace_file},
            )

    def list_metrics(self) -> List[Dict[str, Any]]:
        metrics = self._make_request("GET", "metrics/get_metrics")
        if not metrics:
            print("No metrics available.")
            return
        print("Available metrics:")
        for metric in metrics:
            print(f"- {metric['name']}")
        return

    def execute_metric(
        self, experiment_id: int, metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        return self._make_request(
            "POST",
            "experiments/execute_experiment",
            data={"experiment_id": experiment_id, "metrics": metrics},
        )

    def get_metric_results(self, experiment_id: int) -> List[Dict[str, Any]]:
        return self._make_request(
            "GET", "metrics/get_metric_results", data={"experiment_id": experiment_id}
        )
