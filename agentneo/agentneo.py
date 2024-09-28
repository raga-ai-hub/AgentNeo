import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .data.data_models import Base, ProjectInfoModel
from .tracer import Tracer


class AgentNeo:
    def __init__(self, session_name: str = None):
        self.session_name = (
            session_name or f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )
        self.db_path = self.get_db_path()
        self.engine = create_engine(self.db_path)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.project_id = None
        self.project_name = None
        self.created_on = datetime.now()

    @staticmethod
    def get_db_path():
        # Save the database in the 'ui/public' folder of the package
        package_dir = os.path.dirname(os.path.abspath(__file__))
        public_dir = os.path.join(package_dir, "ui", "public")
        db_filename = "trace_data.db"
        db_path = os.path.join(public_dir, db_filename)
        return f"sqlite:///{db_path}"

    def create_project(self, project_name: str):
        with self.Session() as session:
            # Check if the project_name already exists
            existing_project = (
                session.query(ProjectInfoModel)
                .filter_by(project_name=project_name)
                .first()
            )
            if existing_project:
                raise ValueError(f"Project '{project_name}' already exists.")

            # If the project doesn't exist, create a new one
            project = ProjectInfoModel(
                project_name=project_name, start_time=datetime.now()
            )
            session.add(project)
            session.commit()
            self.project_id = project.id
            self.project_name = project_name
        return self.project_id

    def connect_project(self, project_name: str):
        with self.Session() as session:
            project = (
                session.query(ProjectInfoModel)
                .filter_by(project_name=project_name)
                .first()
            )
            if project:
                self.project_id = project.id
                self.project_name = project_name
            else:
                raise ValueError(f"Project '{project_name}' not found.")
        return self.project_id

    @staticmethod
    def list_projects(num_projects: int = None):
        db_path = AgentNeo.get_db_path()
        engine = create_engine(db_path)
        Session = sessionmaker(bind=engine)
        with Session() as session:
            query = session.query(ProjectInfoModel).order_by(
                ProjectInfoModel.start_time.desc()
            )
            if num_projects:
                query = query.limit(num_projects)
            projects = query.all()
        return [
            {"id": p.id, "name": p.project_name, "start_time": p.start_time}
            for p in projects
        ]
