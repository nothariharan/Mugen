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
    Applies AIF360 pre-processing Reweighing and retrains a RandomForest.
    Fixes bias at the source (data distribution) rather than post-processing.
    """
    # Defensive: ensure no prediction artefacts from audit phase bleed in
    clean_df = df.drop(columns=["y_pred"], errors="ignore").copy()

    # Build AIF360 dataset
    dataset = BinaryLabelDataset(
        df=clean_df,
        label_names=[label_col],
        protected_attribute_names=[sensitive_col]
    )

    # Fit and transform with Reweighing
    reweigh = Reweighing(
        unprivileged_groups=unprivileged_groups,
        privileged_groups=privileged_groups
    )
    reweigh.fit(dataset)
    transformed_dataset = reweigh.transform(dataset)
    weights = transformed_dataset.instance_weights

    # Retrain on reweighted data
    X = clean_df.drop(columns=[label_col])
    y = clean_df[label_col]

    clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    clf.fit(X, y, sample_weight=weights)

    return clf
