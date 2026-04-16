import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from ..state import AUDITS, FIXES
from ..pipeline.phase3 import rules_engine, gemini_judge, pdf_builder

router = APIRouter()

class ReportRequest(BaseModel):
    audit_id: str
    fix_id: str

@router.post("/report")
async def generate_report(request: ReportRequest):
    audit = AUDITS.get(request.audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
        
    fix = FIXES.get(request.fix_id)
    if not fix:
        raise HTTPException(status_code=404, detail="Fix not found")
        
    domain = audit.get("domain", "hiring")
    metrics = fix.get("metrics", {})
    before_score = fix.get("before_score", 100)
    after_score = fix.get("after_score", 100)
    
    # 1. Rules verdict
    rules_verdict = rules_engine.evaluate(domain, metrics)
    
    # Extract examples from Phase 1 for Gemini
    audit_res = audit.get("result", {})
    shap_top5 = audit_res.get("shap_values", {})
    
    # Provide a simple dice example string (since we don't save a single one globally by default)
    dice_example = {"info": "Mutable features such as loan_duration can be changed for recourse"}
    
    # 2. Gemini Writer
    summary_json = await gemini_judge.get_gemini_verdict(
        domain, rules_verdict, metrics, shap_top5, dice_example, before_score, after_score
    )
    
    # 3. PDF Generator
    pdf_bytes = pdf_builder.generate_pdf_report(
        request.audit_id, request.fix_id, summary_json, metrics, before_score, after_score
    )
    
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=compliance_report_{request.audit_id}.pdf"}
    )
