import math
from aif360.metrics import ClassificationMetric
from aif360.datasets import BinaryLabelDataset
import pandas as pd


def _safe_round(value: float, default: float) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default

    if not math.isfinite(numeric):
        return default

    return round(numeric, 3)


def compute_post_fix_metrics(model, df: pd.DataFrame, label_col: str, sensitive_col: str,
                              privileged_groups: list, unprivileged_groups: list,
                              pathway: str = "deep") -> dict:
    """
    Computes post-fix fairness metrics by running predictions from the fixed model
    and feeding them into AIF360 ClassificationMetric.

    pathway="quick" → model is a Fairlearn ThresholdOptimizer (needs sensitive_features kwarg).
    pathway="deep"  → model is a plain sklearn RandomForest (standard predict).
    """
    # Ground-truth AIF360 dataset
    dataset = BinaryLabelDataset(
        df=df,
        label_names=[label_col],
        protected_attribute_names=[sensitive_col]
    )

    # Feature matrix (no label)
    X = df.drop(columns=[label_col])

    df_pred = df.copy()
    if pathway == "quick":
        # ThresholdOptimizer.predict() requires sensitive_features
        df_pred[label_col] = model.predict(X, sensitive_features=X[sensitive_col])
    else:
        # Plain sklearn estimator
        df_pred[label_col] = model.predict(X)

    dataset_pred = BinaryLabelDataset(
        df=df_pred,
        label_names=[label_col],
        protected_attribute_names=[sensitive_col]
    )

    metric_pred = ClassificationMetric(
        dataset,
        dataset_pred,
        unprivileged_groups=unprivileged_groups,
        privileged_groups=privileged_groups
    )

    return {
        "disparate_impact":      _safe_round(metric_pred.disparate_impact(), 0.0),
        "equal_opportunity_diff": _safe_round(metric_pred.equal_opportunity_difference(), 1.0),
        "fnr_gap":               _safe_round(metric_pred.false_negative_rate_difference(), 1.0),
    }
