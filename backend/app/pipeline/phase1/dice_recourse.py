import dice_ml
import pandas as pd

def generate_dice_counterfactuals(model, df: pd.DataFrame, target_col: str, 
                                  sample_index: int = 0, target_outcome: int = 1) -> dict:
    """
    Generating diverse counterfactuals for specific individuals.
    """
    X = df.drop(columns=[target_col])
    # DiCE setup
    d = dice_ml.Data(dataframe=df, continuous_features=X.select_dtypes(include='number').columns.tolist(), outcome_name=target_col)
    # Using 'random' method for speed in POC
    m = dice_ml.Model(model=model, backend="sklearn")
    exp = dice_ml.Dice(d, m, method="random")
    
    # Generate counterfactuals for one sample
    query_instance = X.iloc[[sample_index]]
    cf_results = exp.generate_counterfactuals(query_instance, total_cf=3, desired_class=target_outcome)
    
    # Extract CFs
    cfs_df = cf_results.cf_examples_list[0].final_cfs_df
    
    # Extract feature changes (only fields that differ from query)
    changes = []
    for _, row in cfs_df.iterrows():
        point_changes = {}
        for col in X.columns:
            if row[col] != query_instance[col].values[0]:
                point_changes[col] = {"from": query_instance[col].values[0], "to": row[col]}
        changes.append(point_changes)

    return {
        "counterfactuals": changes,
        "predicted_outcome": target_outcome
    }
