from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import uuid
import pandas as pd
import numpy as np
from ..pipeline.phase1 import proxy, score, audit as fairness_audit, profiling, slicer

router = APIRouter()

class AuditRequest(BaseModel):
    upload_id: str
    domain: str  # hiring|finance|healthcare
    run_security_scan: bool

class AuditResponse(BaseModel):
    audit_id: str

class AuditResult(BaseModel):
    status: str
    result: dict = None

# Global storage for mock hackathon results
AUDITS = {}

@router.post("/audit", response_model=AuditResponse)
async def start_audit(request: AuditRequest, background_tasks: BackgroundTasks):
    audit_id = str(uuid.uuid4())
    AUDITS[audit_id] = {"status": "processing"}
    
    # Simulate processing (real hackathon background logic)
    background_tasks.add_task(run_mock_audit, audit_id, request)
    return {"audit_id": audit_id}

@router.get("/audit/{audit_id}", response_model=AuditResult)
async def get_audit_status(audit_id: str):
    return AUDITS.get(audit_id, {"status": "not_found"})

async def run_mock_audit(audit_id, request):
    # Mock German Credit Dataset
    df = pd.DataFrame({
        'age': np.random.randint(18, 70, 1000),
        'gender': np.random.choice([0, 1], 1000), # 1: Male, 0: Female
        'credit_amount': np.random.randint(500, 15000, 1000),
        'loan_duration': np.random.randint(6, 60, 1000),
        'label': np.random.choice([0, 1], 1000), # Approved (1) or Denied (0)
        'y_pred': np.random.choice([0, 1], 1000) # Predicted labels
    })
    
    # Manual bias injection in mock data
    # Men (1) get approved 70% of the time, Women (0) 40%
    df.loc[df['gender'] == 1, 'y_pred'] = np.random.choice([0, 1], (df['gender'] == 1).sum(), p=[0.3, 0.7])
    df.loc[df['gender'] == 0, 'y_pred'] = np.random.choice([0, 1], (df['gender'] == 0).sum(), p=[0.6, 0.4])

    # Run actual Phase 1 components
    leakage = proxy.compute_leakage_score(df.drop(columns=['label', 'y_pred']), 'gender')
    profile = profiling.profile_data(df.drop(columns=['y_pred']), 'label')
    
    # Fairness metrics using AIF360 logic
    metrics = fairness_audit.run_aif360_audit(
        df, 'label', 'gender', 
        privileged_groups=[{'gender': 1}], 
        unprivileged_groups=[{'gender': 0}],
        y_pred_col='y_pred'
    )
    
    # Composite Score
    bias_info = score.compute_bias_score(
        metrics['disparate_impact'],
        metrics['equal_opportunity_diff'],
        metrics['fnr_gap'],
        leakage['leakage_score']
    )
    
    # Slices
    slices = slicer.discover_bias_slices(df, 'label', 'gender', 'y_pred')

    # Store result
    AUDITS[audit_id] = {
        "status": "done",
        "result": {
            "bias_score": bias_info['bias_score'],
            "plain_english_summary": f"Your model approves loans from men {int((0.7/0.4 - 1)*100)}% more than equally qualified women.",
            "fairness_metrics": metrics,
            "recommended_metric": "equalized_odds" if request.domain != 'hiring' else 'demographic_parity',
            "proxy_leakage": leakage,
            "data_profile": profile,
            "intersectional_slices": slices,
            "score_breakdown": bias_info['breakdown'],
            "model_explorer_points": [
                {
                    "id": i,
                    "age": int(df.iloc[i]['age']),
                    "gender": "Male" if df.iloc[i]['gender'] == 1 else "Female",
                    "credit_amount": int(df.iloc[i]['credit_amount']),
                    "confidence": float(np.random.uniform(0.1, 0.9)),
                    "jitter": float(np.random.uniform(0, 1)),
                    "predicted": int(df.iloc[i]['y_pred'])
                } for i in range(500)
            ]
        }
    }
