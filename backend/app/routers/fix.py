import uuid
import cloudpickle
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..state import AUDITS, FIXES
from ..pipeline.phase2 import quick_fix, deep_fix, validate
from ..pipeline.phase1 import score

router = APIRouter()

# Maps the frontend-facing metric name to the Fairlearn constraint
METRIC_ALIAS = {
    "demographic_parity":  "demographic_parity",
    "equalized_odds":      "equalized_odds",
    "equal_opportunity":   "equalized_odds",
    "fnr_gap":             "equalized_odds",
}


class FixRequest(BaseModel):
    audit_id: str
    pathway: str           # quick | deep
    fairness_metric: str   # demographic_parity | equalized_odds | ...


class FixResponse(BaseModel):
    fix_id: str
    before_score: float
    after_score: float
    fixed_model_url: str
    pathway: str
    post_fix_metrics: dict


@router.post("/fix", response_model=FixResponse)
async def start_fix(request: FixRequest):
    audit = AUDITS.get(request.audit_id)
    if not audit or audit.get("status") != "done":
        raise HTTPException(status_code=404, detail="Audit result not found or not done")

    df           = audit["full_df"].drop(columns=["y_pred"], errors="ignore")
    model        = audit["model"]
    label_col    = audit["label_col"]
    sensitive_col = audit["sensitive_col"]
    priv_group   = audit["priv_group"]
    unpriv_group = audit["unpriv_group"]

    X = df.drop(columns=[label_col])
    y = df[label_col]

    # Map incoming metric to correct constraint name
    fairness_metric = METRIC_ALIAS.get(request.fairness_metric, "demographic_parity")

    try:
        if request.pathway == "quick":
            fixed_model = quick_fix.apply_fairlearn_fix(
                model, X, y, sensitive_col, fairness_metric
            )
        else:
            fixed_model = deep_fix.apply_aif360_reweighing(
                df, label_col, sensitive_col, priv_group, unpriv_group
            )

        # Carry forward leakage score (mitigation doesn't change proxy features)
        leakage_score = audit["result"]["proxy_leakage"]["leakage_score"]

        # Compute post-fix fairness metrics with pathway-aware predict
        post_metrics = validate.compute_post_fix_metrics(
            fixed_model, df, label_col, sensitive_col, priv_group, unpriv_group,
            pathway=request.pathway
        )

        bias_info    = score.compute_bias_score(
            post_metrics.get("disparate_impact", 1.0),
            post_metrics.get("equal_opportunity_diff", 0.0),
            post_metrics.get("fnr_gap", 0.0),
            leakage_score
        )
        after_score  = bias_info["bias_score"]
        before_score = audit["result"]["bias_score"]

        fix_id = str(uuid.uuid4())

        # cloudpickle handles ThresholdOptimizer closures that stdlib pickle cannot
        FIXES[fix_id] = {
            "audit_id":    request.audit_id,
            "pathway":     request.pathway,
            "metrics":     post_metrics,
            "before_score": before_score,
            "after_score":  after_score,
            "model_bytes":  cloudpickle.dumps(fixed_model),
        }

        return {
            "fix_id":            fix_id,
            "before_score":      before_score,
            "after_score":       after_score,
            "fixed_model_url":   f"/api/download/{fix_id}",
            "pathway":           request.pathway,
            "post_fix_metrics":  post_metrics,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
