import shap
import pandas as pd
import numpy as np

def explain_model_shap(model, df: pd.DataFrame, target_col: str, sample_size: int = 1000) -> dict:
    """
    SHAP explanations for global feature importance.
    """
    X = df.drop(columns=[target_col])
    
    # Check model type for best SHAP explainer
    # Use TreeExplainer for tree models (faster)
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.tree import DecisionTreeClassifier
        tree_based = isinstance(model, (RandomForestClassifier, DecisionTreeClassifier))
    except Exception:
        tree_based = False
        
    if tree_based:
        explainer = shap.TreeExplainer(model)
        shap_values_obj = explainer(X.sample(min(sample_size, len(X)), random_state=42))
        shap_values = shap_values_obj.values
        sample_df = X.sample(min(sample_size, len(X)), random_state=42)
    else:
        explainer = shap.KernelExplainer(model.predict_proba, shap.kmeans(X, 10))
        sample_df = X.sample(min(sample_size, len(X)), random_state=42)
        shap_values = explainer.shap_values(sample_df)
    
    # SHAP values for a sample
    sample_df = X.sample(min(sample_size, len(X)), random_state=42)
    shap_values = explainer.shap_values(sample_df)
    
    # Global feature importance: mean absolute SHAP value
    # shap_values[1] is the output for class 1 (binary classification)
    if isinstance(shap_values, list):
        importances = np.abs(shap_values[1]).mean(axis=0)
    else:
        importances = np.abs(shap_values).mean(axis=0)
        
    feature_importance = pd.Series(importances, index=X.columns).sort_values(ascending=False).to_dict()
    
    return {
        "global": feature_importance,
        "sample_points": sample_df.to_dict(orient='records'),
        "sample_shap": shap_values[1].tolist() if isinstance(shap_values, list) else shap_values.tolist()
    }
