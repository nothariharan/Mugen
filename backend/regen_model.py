import pandas as pd
import pickle
import os
from sklearn.ensemble import RandomForestClassifier

data_dir = 'data'
csv_path = os.path.join(data_dir, 'german_credit.csv')
pkl_path = os.path.join(data_dir, 'german_credit_rf.pkl')

print("Reading CSV...")
df = pd.read_csv(csv_path)

# Assumption based on audit.py
label_col = 'label'
X = df.drop(columns=[label_col])
y = df[label_col]

print("Training model...")
model = RandomForestClassifier(n_estimators=50, random_state=42)
model.fit(X, y)

print("Saving model inside Python 3.9 / scikit-learn 1.3.2 / Numpy 1.x environment...")
with open(pkl_path, 'wb') as f:
    pickle.dump(model, f)
print("Done!")
