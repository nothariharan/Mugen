# Shared state for the Mugen backend
# In a real production app, this would be a database (PostgreSQL, Redis, etc.)

import tempfile
import atexit
import shutil
import os

# Stores uploaded file metadata and temp file paths
# Key: upload_id -> Value: dict
UPLOADS = {}

# Stores audit pipeline status and results
# Key: audit_id -> Value: dict
AUDITS = {}

# Stores fix pipeline status and results (including fixed model bytes)
# Key: fix_id -> Value: dict
FIXES = {}

# Base temporary directory for this application instance
TEMP_DIR = tempfile.mkdtemp(prefix="mugen_uploads_")

def cleanup_temp_dir():
    try:
        shutil.rmtree(TEMP_DIR)
    except Exception:
        pass

atexit.register(cleanup_temp_dir)
