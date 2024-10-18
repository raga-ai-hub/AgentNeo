# dashboard_server.py

import os
import sys
import logging
from flask import Flask, send_from_directory
from waitress import serve
from flask import request, abort
from flask_cors import CORS
from contextlib import contextmanager

from flask import jsonify
from ZODB import DB
from ZODB.FileStorage import FileStorage
import transaction


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# Adjust the path to find the 'ui' folder
current_dir = os.path.dirname(os.path.abspath(__file__))
ui_folder = os.path.join(current_dir, "../ui/dist")

app = Flask(__name__, static_folder=ui_folder)
CORS(app)  # Enable CORS

# Initialize the database connection
storage = FileStorage(".mydata.fs")
db = DB(storage)


@contextmanager
def get_db_connection():
    connection = db.open()
    try:
        yield connection
    finally:
        connection.close()


# Remove X-Frame-Options header
@app.after_request
def add_header(response):
    response.headers.pop("X-Frame-Options", None)
    return response


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_static(path):
    logging.info(f"Received request for path: /{path}")
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")


@app.route("/api/projects", methods=["GET"])
def get_projects():
    with get_db_connection() as connection:
        root = connection.root()
        projects = root.get("projects", {})
        project_list = [{"id": p.id, "name": p.project_name} for p in projects.values()]
        return jsonify(project_list)


@app.route("/api/projects/<int:project_id>", methods=["GET"])
def get_project_data(project_id):
    with get_db_connection() as connection:
        root = connection.root()
        projects = root.get("projects", {})
        project = next((p for p in projects.values() if p.id == project_id), None)

        if project is None:
            return jsonify({"error": "Project not found"}), 404

        project_data = {
            "id": project.id,
            "name": project.project_name,
            "start_time": project.start_time,
            "end_time": project.end_time,
            "duration": project.duration,
            "total_cost": dict(project.total_cost),
            "total_tokens": dict(project.total_tokens),
            "traces": [
                {"id": t.id, "start_time": t.start_time}
                for t in project.traces.values()
            ],
        }
        return jsonify(project_data)


@app.route("/api/projects/<int:project_id>/traces/<int:trace_id>", methods=["GET"])
def get_trace_data(project_id, trace_id):
    with get_db_connection() as connection:
        root = connection.root()
        projects = root.get("projects", {})
        project = next((p for p in projects.values() if p.id == project_id), None)

        if project is None:
            return jsonify({"error": "Project not found"}), 404

        trace = project.traces.get(trace_id)
        if trace is None:
            return jsonify({"error": "Trace not found"}), 404

        trace_data = {
            "id": trace.id,
            "start_time": trace.start_time,
            "end_time": trace.end_time,
            "duration": trace.duration,
            "system_info": {
                "os_name": trace.system_info.os_name,
                "os_version": trace.system_info.os_version,
                "python_version": trace.system_info.python_version,
                "cpu_info": trace.system_info.cpu_info,
                "gpu_info": trace.system_info.gpu_info,
                "disk_info": trace.system_info.disk_info,
                "memory_total": trace.system_info.memory_total,
                "installed_packages": dict(trace.system_info.installed_packages),
            },
            "llm_calls": [
                {"id": call.id, "name": call.name} for call in trace.llm_calls.values()
            ],
            "tool_calls": [
                {"id": call.id, "name": call.name} for call in trace.tool_calls.values()
            ],
            "agent_calls": [
                {"id": call.id, "name": call.name}
                for call in trace.agent_calls.values()
            ],
            "metrics": [
                {"id": m.id, "name": m.metric_name} for m in trace.metrics.values()
            ],
            "user_interactions": [
                {"type": ui.type, "timestamp": ui.timestamp}
                for ui in trace.user_interactions
            ],
        }
        return jsonify(trace_data)


@app.route("/api/projects/<int:project_id>/traces", methods=["GET"])
def get_project_traces(project_id):
    with get_db_connection() as connection:
        root = connection.root()
        projects = root.get("projects", {})
        project = next((p for p in projects.values() if p.id == project_id), None)

        if project is None:
            return jsonify({"error": "Project not found"}), 404

        traces_list = [
            {
                "id": trace.id,
                "start_time": trace.start_time,
                "end_time": trace.end_time,
                "duration": trace.duration,
                "llm_calls_count": len(trace.llm_calls),
                "tool_calls_count": len(trace.tool_calls),
                "agent_calls_count": len(trace.agent_calls),
                "metrics_count": len(trace.metrics),
                "user_interactions_count": len(trace.user_interactions),
            }
            for trace in project.traces.values()
        ]

        return jsonify(traces_list)


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

    # Start the server
    logging.info(f"Starting dashboard server on port {port}")
    serve(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
