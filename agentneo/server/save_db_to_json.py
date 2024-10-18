import ZODB
from ZODB.FileStorage import FileStorage
import transaction
import json
from datetime import datetime
from persistent import Persistent
from persistent.list import PersistentList
from persistent.mapping import PersistentMapping
from BTrees.OOBTree import OOBTree
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Open the database
storage = FileStorage(".mydata.fs")
db = ZODB.DB(storage)
connection = db.open()
root = connection.root()


def datetime_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def serialize_persistent_object(obj):
    if isinstance(obj, Persistent):
        return {
            key: serialize_persistent_object(value)
            for key, value in obj.__dict__.items()
            if not key.startswith("_")
        }
    elif isinstance(obj, (list, PersistentList)):
        return [serialize_persistent_object(item) for item in obj]
    elif isinstance(obj, (dict, PersistentMapping, OOBTree)):
        return {
            str(key): serialize_persistent_object(value) for key, value in obj.items()
        }
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj


# Serialize the contents of the root
serialized_data = {}
for key, value in root.items():
    logger.debug(f"Processing root key: {key}")
    if key == "projects":
        serialized_data["projects"] = {}
        for project_id, project in value.items():
            logger.debug(f"Processing project: {project_id}")
            serialized_data["projects"][project_id] = serialize_persistent_object(
                project
            )
    else:
        serialized_data[key] = serialize_persistent_object(value)

# Save the serialized data to a JSON file
with open("zodb_contents.json", "w") as f:
    json.dump(serialized_data, f, indent=2, default=datetime_serializer)

logger.info("ZODB contents have been saved to zodb_contents.json")

# Print some debug information
logger.debug(f"Root keys: {list(root.keys())}")
if "projects" in root:
    logger.debug(f"Number of projects: {len(root['projects'])}")
    for project_id, project in root["projects"].items():
        logger.debug(f"Project {project_id} attributes: {dir(project)}")

# Close the connection
connection.close()
db.close()
storage.close()
