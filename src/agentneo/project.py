from .agent_neo import AgentNeo
from typing import List, Dict, Any


class Project:
    def __init__(self, session: AgentNeo, project_name: str, description: str):
        self.session = session
        self.project_name = project_name
        self.description = description
        self.project_id = None

    def create(self) -> Dict[str, Any]:
        try:
            response = self.session._make_request(
                "POST",
                "projects/create_project",
                data={"name": self.project_name, "description": self.description},
            )
            if "id" in response:
                self.project_id = response["id"]
                print(
                    f"Project '{self.project_name}' created successfully "
                    f"with ID: {self.project_id}"
                )
            else:
                print(
                    f"Failed to create project '{self.project_name}'. "
                    f"Response: {response}"
                )
            return response
        except Exception as e:
            print(f"An error occurred while creating the project: {str(e)}")
            return {"error": str(e)}

    @classmethod
    def list_projects(cls, session: AgentNeo) -> List[Dict[str, Any]]:
        projects = session._make_request("GET", "projects/get_projects")
        if not projects:
            print("No projects available.")
            return
        print("Available projects:")
        for project in projects:
            print(f"- {project['name']}")
        return

    @staticmethod
    def list_metrics(session: AgentNeo) -> List[Dict[str, Any]]:
        metrics = session._make_request("GET", "metrics/get_metrics")
        if not metrics:
            print("No metrics available.")
            return
        print("Available metrics:")
        for metric in metrics:
            print(f"- {metric['name']}")
        return
