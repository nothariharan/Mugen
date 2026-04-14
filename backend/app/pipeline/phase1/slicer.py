import pandas as pd
from sklearn.tree import DecisionTreeClassifier, _tree
import numpy as np

def discover_bias_slices(df: pd.DataFrame, 
                         label_col: str, 
                         sensitive_col: str, 
                         y_pred_col: str) -> list:
    """
    Using a Decision Tree to automatically find demographic slices with high error rates.
    This identifies intersectional bias (e.g., "minority women under 30").
    """
    # Features for the slicer (including sensitive attributes)
    X = df.drop(columns=[label_col, y_pred_col])
    
    # Target: binary indicator of an error (e.g., False Negative)
    # Focusing on False Negatives for high-stakes domains like hiring/finance
    errors = ((df[label_col] == 1) & (df[y_pred_col] == 0)).astype(int)
    
    # Fit a shallow decision tree to find high-error pockets
    dt = DecisionTreeClassifier(max_depth=3, min_samples_leaf=10)
    
    # Prepare X: handle categorical columns by simple numeric encoding for POC
    X_numeric = X.copy()
    for col in X_numeric.select_dtypes(include=['object', 'category']).columns:
        X_numeric[col] = X_numeric[col].astype('category').cat.codes
        
    dt.fit(X_numeric, errors)
    
    # Extract rules from tree (simplified for POC)
    slices = []
    tree_ = dt.tree_
    feature_name = [X.columns[i] if i != _tree.TREE_UNDEFINED else "undefined!" for i in tree_.feature]

    def recurse(node, path):
        if tree_.feature[node] != _tree.TREE_UNDEFINED:
            name = feature_name[node]
            threshold = tree_.threshold[node]
            recurse(tree_.children_left[node], path + [(name, "<=", threshold)])
            recurse(tree_.children_right[node], path + [(name, ">", threshold)])
        else:
            # Leaf node: compute FNR gap
            # Error probability in this leaf
            error_prob = tree_.value[node][0][1] / tree_.value[node][0].sum()
            if error_prob > 0.3: # Threshold for "at risk" pocket
                slices.append({
                    "group": " & ".join([f"{n} {o} {t:.1f}" for n, o, t in path]),
                    "fnr_gap": round(float(error_prob), 2)
                })

    recurse(0, [])
    # Return top 3 most biased slices
    return sorted(slices, key=lambda x: x['fnr_gap'], reverse=True)[:3]
