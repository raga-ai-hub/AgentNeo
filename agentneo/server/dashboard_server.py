# dashboard_server.py

import os
import sys
import logging
from flask import Flask, send_from_directory
from waitress import serve
from flask import request, abort
from flask_cors import CORS

from flask import jsonify
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError

from ..utils import get_db_path
from ..data import ProjectInfoModel, TraceModel

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# Adjust the path to find the 'ui' folder
current_dir = os.path.dirname(os.path.abspath(__file__))
ui_folder = os.path.join(current_dir, "../ui/dist")

app = Flask(__name__, static_folder=ui_folder)
CORS(app)  # Enable CORS


db_path = get_db_path()
# Setup database connection
engine = create_engine(db_path)
Session = sessionmaker(bind=engine)


# Remove X-Frame-Options header
@app.after_request
def add_header(response):
    response.headers.pop("X-Frame-Options", None)
    return response


@app.route("/api/projects", methods=["GET"])
def get_projects():
    try:
        with Session() as session:
            projects = session.query(ProjectInfoModel).all()
            return jsonify(
                [
                    {
                        "id": p.id,
                        "project_name": p.project_name,
                        "start_time": p.start_time,
                        "end_time": p.end_time,
                        "duration": p.duration,
                        "total_cost": p.total_cost,
                        "total_tokens": p.total_tokens,
                    }
                    for p in projects
                ]
            )
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/<int:project_id>", methods=["GET"])
def get_project(project_id):
    try:
        with Session() as session:
            project = session.query(ProjectInfoModel).get(project_id)
            if project is None:
                return jsonify({"error": "Project not found"}), 404
            return jsonify(
                {
                    "id": project.id,
                    "project_name": project.project_name,
                    "start_time": project.start_time,
                    "end_time": project.end_time,
                    "duration": project.duration,
                    "total_cost": project.total_cost,
                    "total_tokens": project.total_tokens,
                }
            )
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/<int:project_id>/traces", methods=["GET"])
def get_project_traces(project_id):
    try:
        with Session() as session:
            traces = session.query(TraceModel).filter_by(project_id=project_id).all()
            return jsonify(
                [
                    {
                        "id": t.id,
                        "start_time": t.start_time,
                        "end_time": t.end_time,
                        "duration": t.duration,
                    }
                    for t in traces
                ]
            )
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/traces/<int:trace_id>", methods=["GET"])
def get_trace(trace_id):
    try:
        with Session() as session:
            trace = (
                session.query(TraceModel)
                .options(
                    joinedload(TraceModel.llm_calls),
                    joinedload(TraceModel.errors),
                    joinedload(TraceModel.system_info),
                )
                .get(trace_id)
            )
            if trace is None:
                return jsonify({"error": "Trace not found"}), 404
            return jsonify(
                {
                    "id": trace.id,
                    "project_id": trace.project_id,
                    "start_time": trace.start_time,
                    "end_time": trace.end_time,
                    "duration": trace.duration,
                    "llm_calls": [
                        {
                            "id": call.id,
                            "name": call.name,
                            "start_time": call.start_time,
                            "end_time": call.end_time,
                            "duration": call.duration,
                            "token_usage": call.token_usage,
                            "cost": call.cost,
                        }
                        for call in trace.llm_calls
                    ],
                    "errors": [
                        {
                            "id": error.id,
                            "error_type": error.error_type,
                            "error_message": error.error_message,
                            "timestamp": error.timestamp,
                        }
                        for error in trace.errors
                    ],
                    "system_info": (
                        {
                            "os_name": trace.system_info.os_name,
                            "os_version": trace.system_info.os_version,
                            "python_version": trace.system_info.python_version,
                            "cpu_info": trace.system_info.cpu_info,
                            "gpu_info": trace.system_info.gpu_info,
                            "disk_info": trace.system_info.disk_info,
                            "memory_total": trace.system_info.memory_total,
                            "installed_packages": trace.system_info.installed_packages,
                        }
                        if trace.system_info
                        else None
                    ),
                }
            )
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health")
def health_check():
    return "OK", 200


@app.route("/api/port")
def get_port():
    return jsonify({"port": os.environ.get("AGENTNEO_DASHBOARD_PORT", "3000")})


@app.route("/dashboard", defaults={"path": ""})
@app.route("/<path:path>")
def serve_static(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")


@app.route("/shutdown", methods=["POST"])
def shutdown():
    if request.remote_addr not in ["127.0.0.1", "::1"]:
        abort(403)
    func = request.environ.get("werkzeug.server.shutdown")
    if func is None:
        raise RuntimeError("Not running with the Werkzeug Server")
    func()
    logging.info("Dashboard server shutting down...")
    return "Server shutting down..."


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Dashboard Server")
    parser.add_argument("--port", type=int, default=3000, help="Port number")
    args = parser.parse_args()

    port = args.port
    os.environ["AGENTNEO_DASHBOARD_PORT"] = str(port)

    # Start the server
    logging.info(f"Starting dashboard server on port {port}")
    serve(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
