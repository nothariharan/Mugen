import shap
import pandas as pd
import numpy as np

def explain_model_shap(model, df: pd.DataFrame, target_col: str, sample_size: int = 1000) -> dict:
    """
    SHAP explanations for global feature importance.
    """
    X = df.drop(columns=[target_col])
    
    # Check model type for best SHAP explainer
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.tree import DecisionTreeClassifier
        tree_based = isinstance(model, (RandomForestClassifier, DecisionTreeClassifier))
    except Exception:
        tree_based = False
        
    sample_df = X.sample(min(sample_size, len(X)), random_state=42)
    
    if tree_based:
        explainer = shap.TreeExplainer(model)
    else:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            explainer = shap.KernelExplainer(model.predict_proba, shap.kmeans(X, 10))
            
    shap_values = explainer.shap_values(sample_df)
    
    if isinstance(shap_values, list):
        sv_class = shap_values[1] if len(shap_values) > 1 else shap_values[0]
    elif getattr(shap_values, "ndim", 0) == 3:
        sv_class = shap_values[:, :, 1] if shap_values.shape[2] > 1 else shap_values[:, :, 0]
    else:
        sv_class = shap_values
        
    importances = np.abs(sv_class).mean(axis=0)
    feature_importance = pd.Series(importances, index=X.columns).sort_values(ascending=False).to_dict()
    
    return {
        "global": feature_importance,
        "sample_points": sample_df.to_dict(orient='records'),
        "sample_shap": sv_class.tolist()
    }
