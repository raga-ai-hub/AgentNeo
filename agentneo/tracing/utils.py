import json
from importlib import resources


def load_model_costs():
    try:
        with open("agentneo/configs/model_costs.json", "r") as file:
            return json.load(file)
    except FileNotFoundError:
        with resources.open_text("agentneo.configs", "model_costs.json") as file:
            return json.load(file)


def log_event(event_data, log_file_path):
    event_data = asdict(event_data)
    with open(log_file_path, "a") as f:
        f.write(json.dumps(event_data) + "\n")
