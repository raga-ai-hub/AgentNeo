import os


def get_db_path():
    db_filename = "trace_data.db"

    # First, try the local directory
    local_db_path = os.path.join(os.getcwd(), "agentneo", "ui", "dist", db_filename)
    if os.path.exists(os.path.dirname(local_db_path)):
        return f"sqlite:///{local_db_path}"

    # If local directory doesn't exist, use the package directory
    package_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(package_dir, "ui", "dist")
    package_db_path = os.path.join(public_dir, db_filename)

    # Ensure the directory exists
    os.makedirs(os.path.dirname(package_db_path), exist_ok=True)

    return f"sqlite:///{package_db_path}"
