from .agent_neo import AgentNeo
from typing import List, Dict, Any


class Project:
    def __init__(self, session: AgentNeo, project_name: str, description: str = None):
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
                return response
            elif (
                "error" in response
                and response["error"] == "You already have a project with this name"
            ):
                print(f"Project '{self.project_name}' already exists.")
                return {"error": "Project already exists"}
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

    def connect(self) -> Dict[str, Any]:
        """
        Connect to an existing project.

        Args:
            project_name (str): The name of the project to connect to.

        Returns:
            Dict[str, Any]: A dictionary containing the response from the server.

        Raises:
            AuthenticationError: If authentication fails.
            ProjectConnectionError: If connecting to the project fails.
            ValueError: If the project name is invalid.
        """
        project_name = self.project_name
        if not project_name or not isinstance(project_name, str):
            raise ValueError("Invalid project name")

        try:
            return self.session._make_request(
                method="POST",
                endpoint="projects/connect_project",
                data={"name": project_name},
            )
        except Exception as e:
            if isinstance(e, AuthenticationError):
                raise
            raise ProjectConnectionError(f"Failed to connect to project: {str(e)}")


class ProjectConnectionError(Exception):
    pass


class AuthenticationError(Exception):
    pass
