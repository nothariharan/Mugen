from fastapi import APIRouter
from fastapi.responses import Response
from ..state import FIXES

router = APIRouter()

@router.get("/download/{fix_id}")
async def download_fixed_model(fix_id: str):
    if fix_id not in FIXES:
        return Response(status_code=404, content="Fix not found")
        
    model_bytes = FIXES[fix_id].get("model_bytes")
    if not model_bytes:
        return Response(status_code=404, content="Model file not ready or failed")
        
    return Response(
        content=model_bytes,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=fixed_model_{fix_id}.pkl"}
    )
