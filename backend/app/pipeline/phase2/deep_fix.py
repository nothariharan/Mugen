from aif360.algorithms.preprocessing import Reweighing
from aif360.datasets import BinaryLabelDataset
from sklearn.ensemble import RandomForestClassifier
import pandas as pd

def apply_aif360_reweighing(df: pd.DataFrame, 
                           label_col: str, 
                           sensitive_col: str, 
                           privileged_groups: list, 
                           unprivileged_groups: list) -> object:
    """
    Applying pre-processing reweighing and retraining a RF model.
    This fixes bias in the training data distribution.
    """
    # Create BinaryLabelDataset
    dataset = BinaryLabelDataset(
        df=df,
        label_names=[label_col],
        protected_attribute_names=[sensitive_col]
    )
    
    # Fit the Reweighing pre-processor
    reweigh = Reweighing(
        unprivileged_groups=unprivileged_groups, 
        privileged_groups=privileged_groups
    )
    reweigh.fit(dataset)
    
    # Transform dataset with weights
    transformed_dataset = reweigh.transform(dataset)
    weights = transformed_dataset.instance_weights
    
    # Retrain a model using these weights
    X = df.drop(columns=[label_col])
    y = df[label_col]
    
    # RandomForestClassifier supports sample weights
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y, sample_weight=weights)
    
    # Return retrained model
    return clf
