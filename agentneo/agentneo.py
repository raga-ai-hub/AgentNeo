import os
from datetime import datetime
from ZODB import DB
from ZODB.FileStorage import FileStorage
from BTrees.OOBTree import OOBTree
import transaction
from .data.data_models import Project
from .tracing import Tracer
from .server.dashboard import launch_dashboard as _launch_dashboard


class AgentNeo:
    def __init__(self, session_name: str = None):
        self.session_name = (
            session_name or f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )
        self.db_path = self.get_db_path()
        self.storage = FileStorage(self.db_path)
        self.db = DB(self.storage)
        self.connection = self.db.open()
        self.root = self.connection.root()

        if "projects" not in self.root:
            self.root["projects"] = OOBTree()

        self.project_id = None
        self.project_name = None
        self.created_on = datetime.now()

    @staticmethod
    def get_db_path():
        db_filename = "trace_data.fs"

        # First, try the local directory
        local_db_path = os.path.join(os.getcwd(), "agentneo", "ui", "dist", db_filename)
        if os.path.exists(os.path.dirname(local_db_path)):
            return local_db_path

        # If local directory doesn't exist, use the package directory
        package_dir = os.path.dirname(os.path.abspath(__file__))
        public_dir = os.path.join(package_dir, "ui", "dist")
        package_db_path = os.path.join(public_dir, db_filename)

        # Ensure the directory exists
        os.makedirs(os.path.dirname(package_db_path), exist_ok=True)

        return package_db_path

    def create_project(self, project_name: str):
        if project_name in self.root["projects"]:
            raise ValueError(f"Project '{project_name}' already exists.")

        project_id = len(self.root["projects"]) + 1
        project = Project(project_id, project_name)
        self.root["projects"][project_name] = project
        transaction.commit()

        self.project_id = project_id
        self.project_name = project_name
        return self.project_id

    def connect_project(self, project_name: str):
        project = self.root["projects"].get(project_name)
        if project:
            self.project_id = project.id
            self.project_name = project_name
        else:
            raise ValueError(f"Project '{project_name}' not found.")
        return self.project_id

    @staticmethod
    def list_projects(num_projects: int = None):
        db_path = AgentNeo.get_db_path()
        storage = FileStorage(db_path)
        db = DB(storage)
        connection = db.open()
        root = connection.root()

        projects = root.get("projects", OOBTree())
        project_list = list(projects.values())
        project_list.sort(key=lambda p: p.start_time, reverse=True)

        if num_projects:
            project_list = project_list[:num_projects]

        result = [
            {"id": p.id, "name": p.project_name, "start_time": p.start_time}
            for p in project_list
        ]

        connection.close()
        return result

    @staticmethod
    def launch_dashboard(port=3000):
        """
        Launches the AgentNeo dashboard.

        :param port: The port to run the dashboard on (default is 3000)
        """
        _launch_dashboard(port)

    def __del__(self):
        if hasattr(self, "connection"):
            self.connection.close()
