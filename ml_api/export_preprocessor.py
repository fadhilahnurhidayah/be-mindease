import pandas as pd
import joblib
from sklearn.preprocessing import LabelEncoder, MinMaxScaler

print("Loading dataset...")
df = pd.read_csv('mental_health_featured.csv').dropna(subset=['risk_level', 'burnout_score'])

cols_to_drop = ['burnout_score', 'risk_level', 'dropout_risk', 'mental_health_index']
X = df.drop(columns=[col for col in cols_to_drop if col in df.columns])

categorical_cols = ['gender', 'sleep_category', 'screen_time_category', 'stress_category', 'support_category']
encoders = {}

print("Fitting LabelEncoders...")
for col in categorical_cols:
    if col in X.columns:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col])
        encoders[col] = le

print("Fitting MinMaxScaler...")
scaler = MinMaxScaler()
scaler.fit(X)

print("Fitting MinMaxScaler for Target (scaler_y)...")
scaler_y = MinMaxScaler()
y_reg = df['burnout_score'].values.reshape(-1, 1)
scaler_y.fit(y_reg)

preprocessor = {
    'encoders': encoders,
    'scaler': scaler,
    'scaler_y': scaler_y,
    'feature_names': list(X.columns)
}

joblib.dump(preprocessor, 'preprocessor.pkl')
print("✅ Preprocessor (Scaler & LabelEncoders) berhasil diekstrak ke preprocessor.pkl!")
