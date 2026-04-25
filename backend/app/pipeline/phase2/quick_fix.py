from fairlearn.postprocessing import ThresholdOptimizer
import pandas as pd

# Map from our internal fairness_metric names to Fairlearn constraint strings
METRIC_TO_CONSTRAINT = {
    "demographic_parity":    "demographic_parity",
    "equalized_odds":        "equalized_odds",
    "equal_opportunity":     "equalized_odds",   # fairlearn uses equalized_odds for this
    "fnr_gap":               "equalized_odds",
}


def apply_fairlearn_fix(model, X: pd.DataFrame, y: pd.Series, sensitive_col: str,
                        fairness_metric: str = "demographic_parity") -> object:
    """
    Applies a post-processing ThresholdOptimizer via Fairlearn.
    Adjusts classification thresholds to satisfy the chosen fairness constraint
    without retraining the model or touching training data.
    """
    constraint = METRIC_TO_CONSTRAINT.get(fairness_metric, "demographic_parity")

    # objective must match Fairlearn's exact constant strings:
    # For demographic_parity / simple constraints: balanced_accuracy_score, accuracy_score,
    #   selection_rate, true_positive_rate, true_negative_rate
    # For equalized_odds: balanced_accuracy_score, accuracy_score
    # We use balanced_accuracy_score — valid for both constraint families.
    optimizer = ThresholdOptimizer(
        estimator=model,
        constraints=constraint,
        objective="balanced_accuracy_score",
        predict_method="predict_proba",
        prefit=True,
    )

    # sensitive_features must be a 1-D array matching X rows
    optimizer.fit(X, y, sensitive_features=X[sensitive_col])

    return optimizer
