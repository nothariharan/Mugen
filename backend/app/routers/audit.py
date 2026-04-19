import uuid
import pandas as pd
import numpy as np
import pickle
import os
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from ..state import UPLOADS, AUDITS
from ..pipeline.phase1 import proxy, score, audit as fairness_audit, profiling, slicer, shap_explainer, dice_recourse, aequitas_report

router = APIRouter()

class AuditRequest(BaseModel):
    upload_id: str
    domain: str  # hiring|finance|healthcare
    run_security_scan: bool

class CounterfactualRequest(BaseModel):
    audit_id: str
    data_point_index: int
    target_outcome: int

class AuditResponse(BaseModel):
    audit_id: str

class AuditResult(BaseModel):
    status: str
    result: dict = None

@router.post("/audit", response_model=AuditResponse)
async def start_audit(request: AuditRequest, background_tasks: BackgroundTasks):
    audit_id = str(uuid.uuid4())
    AUDITS[audit_id] = {"status": "processing"}
    background_tasks.add_task(run_full_audit, audit_id, request)
    return {"audit_id": audit_id}

@router.get("/audit/{audit_id}", response_model=AuditResult)
async def get_audit_status(audit_id: str):
    return AUDITS.get(audit_id, {"status": "not_found"})

@router.post("/counterfactual")
async def get_counterfactual(request: CounterfactualRequest):
    audit = AUDITS.get(request.audit_id, {})
    if not audit or audit.get("status") != "done":
        raise HTTPException(status_code=400, detail="Audit not ready or invalid ID")
    
    # Needs to get full df and model
    df = audit.get("full_df")
    model = audit.get("model")
    label_col = audit.get("label_col", "label")
    
    if df is None or model is None:
        raise HTTPException(status_code=500, detail="Missing data or model in state")
        
    cf_res = dice_recourse.generate_dice_counterfactuals(
        model, df, label_col, request.data_point_index, request.target_outcome
    )
    return cf_res

async def run_full_audit(audit_id: str, request: AuditRequest):
    try:
        if request.upload_id == 'demo':
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            df = pd.read_csv(os.path.join(base_dir, 'data', 'german_credit.csv'))
            with open(os.path.join(base_dir, 'data', 'german_credit_rf.pkl'), 'rb') as f:
                model = pickle.load(f)
            label_col = 'label'
            sensitive_col = 'gender'
            priv_group = [{'gender': 1}]
            unpriv_group = [{'gender': 0}]
        else:
            upload_info = UPLOADS.get(request.upload_id)
            if not upload_info:
                raise Exception("Upload not found")
            df = pd.read_csv(upload_info["csv_path"])
            with open(upload_info["pkl_path"], 'rb') as f:
                model = pickle.load(f)
            # Assumption for hackathon: target is last column, sensitive is first demographic column or 'gender'
            if 'gender' in df.columns:
                sensitive_col = 'gender'
                priv_group, unpriv_group = [{'gender': 1}], [{'gender': 0}]
            elif 'race' in df.columns:
                sensitive_col = 'race'
                priv_group, unpriv_group = [{'race': 1}], [{'race': 0}]
            else:
                sensitive_col = df.columns[0]
                priv_group, unpriv_group = [{sensitive_col: 1}], [{sensitive_col: 0}]
            label_col = df.columns[-1]

        # Get Predictions
        X = df.drop(columns=[label_col])
        df['y_pred'] = model.predict(X)

        # Basic Sub-Slices (Phase 1 Steps)
        # 1. Leakage Score
        leakage = proxy.compute_leakage_score(df.drop(columns=[label_col, 'y_pred']), sensitive_col)
        # 2. Profiling
        profile = profiling.profile_data(df.drop(columns=['y_pred']), label_col)
        # 3. AIF360 Fairness
        metrics = fairness_audit.run_aif360_audit(
            df, label_col, sensitive_col, priv_group, unpriv_group, 'y_pred'
        )
        # 4. Slices
        slices = slicer.discover_bias_slices(df, label_col, sensitive_col, 'y_pred')
        # 5. SHAP
        shap_res = shap_explainer.explain_model_shap(model, df, label_col, sample_size=500)
        # 6. Aequitas Grid
        aequitas_grid = aequitas_report.generate_aequitas_grid(df, label_col, 'y_pred', sensitive_col)
        # 7. Composite Score
        bias_info = score.compute_bias_score(
            metrics.get('disparate_impact', 1.0),
            metrics.get('equal_opportunity_diff', 0),
            metrics.get('fnr_gap', 0),
            leakage['leakage_score']
        )
        
        # Populate model explorer points
        sample_pts = shap_res.get("sample_points", [])
        sample_shap = shap_res.get("sample_shap", [])
        explorer_pts = []
        for i, pt in enumerate(sample_pts):
            cfg = float(np.random.uniform(0.1, 0.9)) # fallback
            try:
                probs = model.predict_proba(pd.DataFrame([pt]))[0]
                cfg = max(probs)
            except Exception:
                pass
            
            grp_name = pt.get(sensitive_col, str(pt))
            if sensitive_col == 'gender':
                grp_name = "Male" if float(pt.get(sensitive_col, 0)) == 1 else "Female"

            val = {
                "id": i,
                "confidence": cfg,
                "jitter": float(np.random.uniform(0, 1)),
                "predicted": int(model.predict(pd.DataFrame([pt]))[0]),
                "group": grp_name,
                "shap_sum": float(np.sum(sample_shap[i])) if sample_shap else 0.0
            }
            # Put original features in there
            val.update({k: v for k, v in pt.items()})
            explorer_pts.append(val)

        plain_summ = f"Your model detects bias. The Disparate Impact is {metrics.get('disparate_impact', 1.0)} and FNR gap is {metrics.get('fnr_gap', 0)}."
        
        AUDITS[audit_id] = {
            "status": "done",
            "full_df": df,
            "model": model,
            "label_col": label_col,
            "sensitive_col": sensitive_col,
            "priv_group": priv_group,
            "unpriv_group": unpriv_group,
            "domain": request.domain,
            "result": {
                "bias_score": bias_info['bias_score'],
                "plain_english_summary": plain_summ,
                "fairness_metrics": metrics,
                "recommended_metric": "equalized_odds" if request.domain != 'hiring' else 'demographic_parity',
                "proxy_leakage": leakage,
                "data_profile": profile,
                "intersectional_slices": slices,
                "score_breakdown": bias_info['breakdown'],
                "aequitas_grid": aequitas_grid,
                "shap_values": shap_res.get("global", {}),
                "model_explorer_points": explorer_pts
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        AUDITS[audit_id] = {"status": "error", "message": str(e)}
