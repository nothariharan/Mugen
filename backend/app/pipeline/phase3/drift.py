import pandas as pd
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset
from evidently.metrics import DataDriftTable, DatasetDriftMetric

def generate_drift_report(reference_df: pd.DataFrame, current_df: pd.DataFrame) -> str:
    """
    Generating an HTML drift report using Evidently AI.
    """
    # Create drift report
    report = Report(metrics=[
        DataDriftPreset(),
        TargetDriftPreset(),
    ])
    
    # Fit the report
    report.run(reference_data=reference_df, current_data=current_df)
    
    # Save to a temporary HTML string or local file
    return report.get_html()
