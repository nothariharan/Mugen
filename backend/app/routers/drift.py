from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from ..state import AUDITS

router = APIRouter()

@router.get("/drift/{audit_id}", response_class=HTMLResponse)
async def get_drift_report(audit_id: str):
    if audit_id not in AUDITS:
        raise HTTPException(status_code=404, detail="Audit not found")
        
    audit = AUDITS[audit_id]
    html = audit.get("drift_report_html")
    
    if not html:
        # Fallback if no drift report generated
        return """
        <html>
            <body style='font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc'>
                <div style='text-align: center; color: #64748b;'>
                    <h2>Drift Report Not Available</h2>
                    <p>Insufficient data to compute data drift.</p>
                </div>
            </body>
        </html>
        """
        
    return HTMLResponse(content=html)
