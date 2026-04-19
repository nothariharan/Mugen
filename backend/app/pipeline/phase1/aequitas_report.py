import pandas as pd
from aequitas.group import Group
from aequitas.bias import Bias

def generate_aequitas_grid(df: pd.DataFrame, label_col: str, y_pred_col: str, sensitive_col: str) -> dict:
    """
    Generates an Aequitas fairness grid for a protected attribute.
    """
    # Aequitas expects 'score' for predictions and 'label_value' for truth
    audit_df = df.copy()
    audit_df['score'] = audit_df[y_pred_col]
    audit_df['label_value'] = audit_df[label_col]
    
    # Needs to be string for categorical processing
    audit_df[sensitive_col] = audit_df[sensitive_col].astype(str)
    
    g = Group()
    xtab, _ = g.get_crosstabs(audit_df, score_thresholds=None, attr_cols=[sensitive_col])
    
    b = Bias()
    try:
        # We assume the majority class or a specific class is the reference group
        # In a real system, you might want to dynamically set this or let the user choose
        ref_group = str(audit_df[sensitive_col].mode()[0])
        bdf = b.get_disparity_predefined_groups(xtab, original_df=audit_df, 
                                                ref_groups_dict={sensitive_col: ref_group}, 
                                                alpha=0.05, mask_significance=True)
        
        groups = bdf['attribute_value'].tolist()
        
        # We extract several common metric disparities
        metrics = []
        if 'fpr_disparity' in bdf.columns:
            metrics.append({
                "metric_name": "False Positive Rate Disparity",
                "values": bdf['fpr_disparity'].fillna(0).round(2).tolist()
            })
        if 'fnr_disparity' in bdf.columns:
            metrics.append({
                "metric_name": "False Negative Rate Disparity",
                "values": bdf['fnr_disparity'].fillna(0).round(2).tolist()
            })
        if 'ppr_disparity' in bdf.columns:
            metrics.append({
                "metric_name": "Predicted Positive Rate Disparity",
                "values": bdf['ppr_disparity'].fillna(0).round(2).tolist()
            })
            
        return {
            "groups": groups,
            "metrics": metrics
        }
    except Exception as e:
        print(f"Aequitas computation error: {e}")
        return {
            "groups": audit_df[sensitive_col].unique().tolist(),
            "metrics": []
        }
