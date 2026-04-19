from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
import uuid
import os
from ..state import UPLOADS, TEMP_DIR
import pandas as pd
from ..pipeline.phase1 import scan

router = APIRouter()

class UploadResponse(BaseModel):
    upload_id: str
    csv_rows: int
    pkl_size_kb: int
    security_scan_passed: bool

@router.post("/upload", response_model=UploadResponse)
async def upload_files(csv_file: UploadFile = File(...), pkl_file: UploadFile = File(...)):
    upload_id = str(uuid.uuid4())
    
    csv_path = os.path.join(TEMP_DIR, f"{upload_id}_{csv_file.filename}")
    pkl_path = os.path.join(TEMP_DIR, f"{upload_id}_{pkl_file.filename}")
    
    with open(csv_path, "wb") as buffer:
        buffer.write(await csv_file.read())
        
    with open(pkl_path, "wb") as buffer:
        buffer.write(await pkl_file.read())
        
    # Get metadata
    df = pd.read_csv(csv_path)
    csv_rows = len(df)
    pkl_size_kb = os.path.getsize(pkl_path) // 1024
    
    # Run ModelScan
    scan_result = scan.run_security_scan(pkl_path)
    
    # Store in memory
    UPLOADS[upload_id] = {
        "csv_path": csv_path,
        "pkl_path": pkl_path,
        "csv_rows": csv_rows,
        "pkl_size_kb": pkl_size_kb,
        "security_scan_passed": scan_result["passed"]
    }
    
    return {
        "upload_id": upload_id,
        "csv_rows": csv_rows,
        "pkl_size_kb": pkl_size_kb,
        "security_scan_passed": scan_result["passed"]
    }
