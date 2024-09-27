from agentneo import AgentNeo


class Evaluation:
    def __init__(self, session: AgentNeo, metrics: list):
        self.session = session
        self.metrics = metrics
        self.results = None

    def run(self):
        # Placeholder for evaluation logic
        # This should be implemented based on the specific evaluation requirements
        print("Running evaluation...")
        self.results = {"placeholder": "Evaluation results would go here"}
        return self

    def status(self):
        if self.results:
            return "Completed"
        else:
            return "Not started"

    def result(self):
        return self.results
