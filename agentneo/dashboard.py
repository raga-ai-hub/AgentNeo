import subprocess
import os
import sys
import psutil
import requests
import time
import signal
import socket
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(message)s")


def check_node_npm():
    """Check if Node.js and npm are installed."""
    try:
        subprocess.run(
            ["node", "--version"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        subprocess.run(
            ["npm", "--version"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def install_react_dependencies(ui_folder):
    """Install React dependencies using npm."""
    try:
        subprocess.run(["npm", "install"], cwd=ui_folder, check=True)
        return True
    except subprocess.CalledProcessError:
        return False


def find_free_port(start_port=3000, max_port=3100):
    """Finds a free port between start_port and max_port."""
    for port in range(start_port, max_port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("localhost", port))
                return port
            except OSError:
                continue
    return None


def launch_dashboard(port=3000):
    """Launches the dashboard on a specified port."""
    ui_folder = os.path.join(os.path.dirname(__file__), "ui")

    if not os.path.exists(ui_folder):
        logging.error(f"Error: UI folder not found at {ui_folder}")
        return

    # Check if Node.js and npm are installed
    if not check_node_npm():
        logging.error("Error: Node.js and npm are required but not installed.")
        logging.info("Please install Node.js and npm to continue:")
        logging.info("1. Visit https://nodejs.org/")
        logging.info("2. Download and install the LTS version")
        logging.info("3. Restart your terminal/command prompt after installation")
        logging.info("4. Run this command again")
        logging.info(
            "If the issue persists, please raise an issue at: https://github.com/raga-ai-hub/agentneo/issues"
        )
        return

    # Try to install React dependencies
    logging.info("Attempting to install React dependencies...")
    if not install_react_dependencies(ui_folder):
        logging.error("Error: Failed to install React dependencies.")
        logging.info("Please try the following steps manually:")
        logging.info("1. Navigate to the UI folder: cd " + ui_folder)
        logging.info("2. Run: npm install")
        logging.info(
            "3. If you encounter any errors, try deleting the node_modules folder and package-lock.json file, then run npm install again"
        )
        logging.info(
            "4. If problems persist, please check your internet connection and npm configuration"
        )
        logging.info(
            "If you're still experiencing issues, please raise an issue at: https://github.com/raga-ai-hub/agentneo/issues"
        )
        return

    # Attempt to use the specified port
    free_port = port
    if not is_port_free(port):
        # Find a free port if the specified port is busy
        free_port = find_free_port(port + 1)
        if free_port is None:
            logging.error(f"No free ports available starting from {port}")
            return
        else:
            logging.info(f"Port {port} is busy. Using port {free_port} instead.")

    original_cwd = os.getcwd()
    try:
        os.chdir(ui_folder)

        # Set environment variable for the port
        env = os.environ.copy()
        env["PORT"] = str(free_port)

        # Launch npm start with the specified port
        if sys.platform.startswith("win"):
            # For Windows, use 'set' command in shell
            command = f"set PORT={free_port} && npm start"
            process = subprocess.Popen(
                command,
                shell=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
        else:
            # For Unix-like systems, pass env variable
            process = subprocess.Popen(
                ["npm", "start"],
                start_new_session=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
            )

        # Wait for the server to start
        server_started = False
        start_time = time.time()
        timeout = 30
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"http://localhost:{free_port}", timeout=1)
                if response.status_code == 200:
                    server_started = True
                    break
            except requests.ConnectionError:
                pass
            except requests.Timeout:
                pass
            # Check if process has terminated
            if process.poll() is not None:
                # Process has terminated, get output and error
                stdout, stderr = process.communicate()
                logging.error("Error: Dashboard process terminated unexpectedly.")
                if stdout:
                    logging.error(f"Standard Output:\n{stdout}")
                if stderr:
                    logging.error(f"Standard Error:\n{stderr}")
                return
            time.sleep(1)

        if server_started:
            logging.info(
                f"Dashboard launched successfully. Access it at: http://localhost:{free_port}"
            )
        else:
            logging.error("Error: Dashboard failed to start within the expected time.")
            stdout, stderr = process.communicate()
            if stdout:
                logging.error(f"Standard Output:\n{stdout}")
            if stderr:
                logging.error(f"Standard Error:\n{stderr}")
    except Exception as e:
        logging.error(f"Error launching dashboard: {str(e)}")
    finally:
        # Change back to the original directory
        os.chdir(original_cwd)


def is_port_free(port):
    """Checks if a port is free."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("localhost", port))
            return True
        except OSError:
            return False


def is_dashboard_process(proc, port=None):
    """Checks if a process is a dashboard process running on a specific port."""
    try:
        name = proc.name().lower()
        cmdline = " ".join(proc.cmdline())
        if "node" in name and "react-scripts" in cmdline:
            if port is None:
                return True
            else:
                # Check if the process is listening on the specified port
                connections = proc.connections(kind="inet")
                for conn in connections:
                    if conn.status == psutil.CONN_LISTEN and conn.laddr.port == port:
                        return True
    except (psutil.AccessDenied, psutil.ZombieProcess, psutil.NoSuchProcess):
        pass
    return False


def close_dashboard(port):
    """Closes the dashboard process running on the specified port."""
    dashboard_closed = False
    terminated_pids = []
    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        if is_dashboard_process(proc, port):
            try:
                pid = proc.pid
                if sys.platform.startswith("win"):
                    os.kill(pid, signal.CTRL_BREAK_EVENT)
                else:
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
                logging.info(
                    f"Terminated dashboard process with PID {pid} on port {port}"
                )
                dashboard_closed = True
                terminated_pids.append(pid)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

    if not dashboard_closed:
        logging.info(f"No dashboard process found running on port {port}.")
        return

    # Wait for the process to terminate
    time.sleep(2)

    # Check if the process is still running
    for pid in terminated_pids:
        try:
            proc = psutil.Process(pid)
            if is_dashboard_process(proc, port):
                logging.info(
                    "Dashboard process is still running. Attempting to force close..."
                )
                try:
                    proc.kill()
                    logging.info(f"Force closed dashboard process with PID {proc.pid}")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            else:
                logging.info(f"Dashboard process with PID {pid} has been terminated.")
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            logging.info(f"Dashboard process with PID {pid} has been terminated.")
