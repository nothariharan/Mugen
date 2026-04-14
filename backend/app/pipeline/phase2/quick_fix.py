from fairlearn.postprocessing import ThresholdOptimizer
import pandas as pd

def apply_fairlearn_fix(model, X: pd.DataFrame, y: pd.Series, sensitive_col: str, 
                        fairness_metric: str = "demographic_parity") -> object:
    """
    Applying a post-processing threshold optimizer via fairlearn.
    This replaces model prediction logic for fairness without retraining.
    """
    # Create ThresholdOptimizer
    # fairness_metric can be: demographic_parity, equalized_odds
    optimizer = ThresholdOptimizer(
        estimator=model,
        constraints=fairness_metric,
        predict_method='predict_proba',
        prefit=True
    )
    
    # Fit the optimizer
    optimizer.fit(X, y, sensitive_features=X[sensitive_col])
    
    # Returns the wrapped predictor
    return optimizer
