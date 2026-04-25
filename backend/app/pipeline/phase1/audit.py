import math
import pandas as pd
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric, ClassificationMetric


def _safe_round(value: float, default: float) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default

    if not math.isfinite(numeric):
        return default

    return round(numeric, 3)

def run_aif360_audit(df: pd.DataFrame, 
                     label_col: str, 
                     sensitive_col: str, 
                     privileged_groups: list, 
                     unprivileged_groups: list,
                     y_pred_col: str = None) -> dict:
    """
    Using AIF360 for fairness metrics.
    """
    # Create BinaryLabelDataset for original and/or predicted data
    dataset = BinaryLabelDataset(
        df=df,
        label_names=[label_col],
        protected_attribute_names=[sensitive_col]
    )
    
    # Dataset metrics
    metric_orig = BinaryLabelDatasetMetric(
        dataset, 
        unprivileged_groups=unprivileged_groups, 
        privileged_groups=privileged_groups
    )
    
    metrics = {
        "disparate_impact": _safe_round(metric_orig.disparate_impact(), 0.0),
        "statistical_parity_difference": _safe_round(metric_orig.statistical_parity_difference(), 0.0),
        "mean_difference": _safe_round(metric_orig.mean_difference(), 0.0)
    }

    # If predicted labels provided, add classification metrics
    if y_pred_col and y_pred_col in df.columns:
        dataset_pred = dataset.copy()
        dataset_pred.labels = df[y_pred_col].values
        
        metric_pred = ClassificationMetric(
            dataset, 
            dataset_pred, 
            unprivileged_groups=unprivileged_groups, 
            privileged_groups=privileged_groups
        )
        
        metrics.update({
            "equal_opportunity_diff": _safe_round(metric_pred.equal_opportunity_difference(), 1.0),
            "average_odds_diff": _safe_round(metric_pred.average_odds_difference(), 1.0),
            "fnr_gap": _safe_round(metric_pred.false_negative_rate_difference(), 1.0),
            "fpr_gap": _safe_round(metric_pred.false_positive_rate_difference(), 1.0)
        })
    
    return metrics
