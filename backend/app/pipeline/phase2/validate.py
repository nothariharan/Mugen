from aif360.metrics import ClassificationMetric
from aif360.datasets import BinaryLabelDataset
import pandas as pd

def compute_post_fix_metrics(model, df: pd.DataFrame, label_col: str, sensitive_col: str, 
                              privileged_groups: list, unprivileged_groups: list) -> dict:
    """
    Computes post-fix fairness metrics by running predictions from the fixed model
    and feeding it into AIF360 ClassificationMetric.
    """
    # Create dataset objects
    dataset = BinaryLabelDataset(
        df=df,
        label_names=[label_col],
        protected_attribute_names=[sensitive_col]
    )
    
    # Get predictions
    df_pred = df.copy()
    X = df.drop(columns=[label_col])
    # fairlearn ThresholdOptimizer has 'predict' that acts like a standard model
    df_pred[label_col] = model.predict(X)
    
    dataset_pred = BinaryLabelDataset(
        df=df_pred,
        label_names=[label_col],
        protected_attribute_names=[sensitive_col]
    )
    
    # Metrics
    metric_pred = ClassificationMetric(
        dataset, 
        dataset_pred, 
        unprivileged_groups=unprivileged_groups, 
        privileged_groups=privileged_groups
    )
    
    return {
        "disparate_impact": round(metric_pred.disparate_impact(), 3),
        "equal_opportunity_diff": round(metric_pred.equal_opportunity_difference(), 3),
        "fnr_gap": round(metric_pred.false_negative_rate_difference(), 3)
    }
