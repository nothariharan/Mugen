import pandas as pd
from deepchecks.tabular import Dataset
from deepchecks.tabular.checks import DataDuplicates, FeatureLabelCorrelation, FeatureDrift

def profile_data(df: pd.DataFrame, label_col: str) -> dict:
    """
    Using deepchecks to profile data for quality and gaps.
    """
    # Create deepchecks dataset
    ds = Dataset(df, label=label_col)
    
    # Run a few key checks
    duplicate_check = DataDuplicates().run(ds)
    correlation_check = FeatureLabelCorrelation().run(ds)
    
    # Representational gaps (mocked for simplicity in hackathon POC)
    gaps = []
    # Identify low-count categories in categorical columns
    for col in df.select_dtypes(include=['object', 'category']).columns:
        counts = df[col].value_counts(normalize=True)
        minority_groups = counts[counts < 0.05].index.tolist()
        if minority_groups:
            gaps.append({"column": col, "underrepresented": minority_groups})

    return {
        "rows": len(df),
        "missing_pct": round(df.isnull().mean().mean() * 100, 2),
        "duplicates": int(duplicate_check.value),
        "representational_gaps": gaps,
        "feature_correlations": correlation_check.value.to_dict() if hasattr(correlation_check.value, 'to_dict') else str(correlation_check.value)
    }
