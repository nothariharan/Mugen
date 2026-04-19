from fastapi import APIRouter
from typing import List

router = APIRouter()

@router.get("/datasets")
async def list_datasets():
    return [
        {
            "id": "german_credit",
            "name": "German Credit",
            "domain": "finance",
            "rows": 1000,
            "description": "Standard dataset for evaluating credit scoring bias."
        },
        {
            "id": "adult_income",
            "name": "Adult Income",
            "domain": "hiring",
            "rows": 48842,
            "description": "Predicts whether income exceeds $50K/yr based on census data."
        },
        {
            "id": "compas",
            "name": "COMPAS",
            "domain": "hiring",
            "rows": 7214,
            "description": "ProPublica's dataset on recidivism prediction."
        }
    ]
