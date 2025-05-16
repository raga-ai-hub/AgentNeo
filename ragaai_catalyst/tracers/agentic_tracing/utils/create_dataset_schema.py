import os
import json
import re
import requests
from ragaai_catalyst.tracers.agentic_tracing.tracers.base import RagaAICatalyst

def create_dataset_schema_with_trace(project_name, dataset_name, base_url=None, user_details=None, timeout=120):
    SCHEMA_MAPPING = {}
    metadata = user_details.get("trace_user_detail").get("metadata")
    if metadata and isinstance(metadata, dict):
        for key, value in metadata.items():
            if key in ["log_source", "recorded_on"]:
                continue
            SCHEMA_MAPPING[key] = {"columnType": "metadata"}

    def make_request():
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.getenv('RAGAAI_CATALYST_TOKEN')}",
            "X-Project-Name": project_name,
        }
        if SCHEMA_MAPPING:
            payload = json.dumps({
                "datasetName": dataset_name,
                "traceFolderUrl": None,
                "schemaMapping": SCHEMA_MAPPING
            })
        else:
            payload = json.dumps({
                "datasetName": dataset_name,
                "traceFolderUrl": None,
            })
        # Use provided base_url or fall back to default
        url_base = base_url if base_url is not None else RagaAICatalyst.BASE_URL
        response = requests.request("POST",
            f"{url_base}/v1/llm/dataset/logs",
            headers=headers,
            data=payload,
            timeout=timeout
        )
        return response
    response = make_request()
    return response