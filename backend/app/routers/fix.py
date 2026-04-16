import uuid
import pickle
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..state import AUDITS, FIXES
from ..pipeline.phase2 import quick_fix, deep_fix, validate
from ..pipeline.phase1 import score

router = APIRouter()

class FixRequest(BaseModel):
    audit_id: str
    pathway: str  # quick|deep
    fairness_metric: str

class FixResponse(BaseModel):
    fix_id: str
    before_score: float
    after_score: float
    fixed_model_url: str

@router.post("/fix", response_model=FixResponse)
async def start_fix(request: FixRequest):
    audit = AUDITS.get(request.audit_id)
    if not audit or audit.get("status") != "done":
        raise HTTPException(status_code=404, detail="Audit result not found or not done")
    
    df = audit['full_df']
    model = audit['model']
    label_col = audit['label_col']
    sensitive_col = audit['sensitive_col']
    priv_group = audit['priv_group']
    unpriv_group = audit['unpriv_group']
    
    X = df.drop(columns=[label_col])
    y = df[label_col]
    
    try:
        if request.pathway == "quick":
            fixed_model = quick_fix.apply_fairlearn_fix(
                model, X, y, sensitive_col, "demographic_parity" # map request.fairness_metric robustly in prod
            )
        else:
            fixed_model = deep_fix.apply_aif360_reweighing(
                df, label_col, sensitive_col, priv_group, unpriv_group
            )
        
        # We need the previous audit result to carry over leakage score since Phase 2 
        # (thresholds/weights) doesn't change proxy features in the data
        leakage_score = audit['result']['proxy_leakage']['leakage_score']
        
        metrics = validate.compute_post_fix_metrics(
            fixed_model, df, label_col, sensitive_col, priv_group, unpriv_group
        )
        
        bias_info = score.compute_bias_score(
            metrics.get("disparate_impact", 1.0),
            metrics.get("equal_opportunity_diff", 0.0),
            metrics.get("fnr_gap", 0.0),
            leakage_score
        )
        after_score = bias_info["bias_score"]
        before_score = audit['result']['bias_score']
        
        fix_id = str(uuid.uuid4())
        
        FIXES[fix_id] = {
            "audit_id": request.audit_id,
            "pathway": request.pathway,
            "metrics": metrics,
            "before_score": before_score,
            "after_score": after_score,
            "model_bytes": pickle.dumps(fixed_model)
        }
        
        return {
            "fix_id": fix_id,
            "before_score": before_score,
            "after_score": after_score,
            "fixed_model_url": f"/api/download/{fix_id}"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
