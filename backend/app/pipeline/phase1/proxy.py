from sklearn.feature_selection import mutual_info_classif
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
import pandas as pd, numpy as np

def compute_leakage_score(df: pd.DataFrame, sensitive_col: str) -> dict:
    X = df.drop(columns=[sensitive_col])
    y = df[sensitive_col]
    # mutual information for each feature
    # Using only numeric columns for hackathon POC
    numeric_df = X.select_dtypes(include='number')
    if numeric_df.empty:
        return { 'leakage_score': 0.0, 'top_proxy_features': {} }
        
    mi = mutual_info_classif(numeric_df, y)
    mi_df = pd.Series(mi, index=numeric_df.columns)
    top_proxies = mi_df.nlargest(5).to_dict()
    # train classifier to predict sensitive attr from other features
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    scores = cross_val_score(clf, numeric_df, y, cv=3)
    leakage_score = float(np.mean(scores))  # high accuracy = high leakage
    return { 'leakage_score': round(leakage_score, 3), 'top_proxy_features': top_proxies }
