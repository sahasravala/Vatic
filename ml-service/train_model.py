import requests
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, confusion_matrix

FEATURES = [
    # stock-only
    "return1d", "return2d", "return5d", "return10d",
    "priceVsMa5", "priceVsMa20", "ma5VsMa20",
    "volatility5", "volatility20",
    "volumeVsAvg",
    "intradayRange", "closePosition", "gapOpen",
    # market context
    "marketReturn1d", "marketReturn5d",
    "excessReturn1d", "excessReturn5d",
    "relativeStrength20",
    "vixLevel", "vixChange",
]

# ---------- Load pooled data ----------
print("Fetching pooled training data...")
response = requests.get("http://localhost:8080/training-data/all", timeout=300)
df = pd.DataFrame(response.json())

df["date"] = pd.to_datetime(df["date"])
df = df.sort_values(["date", "symbol"]).reset_index(drop=True)
df = df.dropna(subset=FEATURES + ["target"])

print(f"Total examples: {len(df):,}")
print(f"Tickers: {df['symbol'].nunique()}")
print(f"Date range: {df['date'].min().date()} to {df['date'].max().date()}")
print(f"Overall UP rate: {(df['target'] == 'UP').mean():.4f}")
print()

# ---------- Chronological split BY DATE (not by row) ----------
unique_dates = np.sort(df["date"].unique())
cutoff = unique_dates[int(len(unique_dates) * 0.8)]

train = df[df["date"] < cutoff]
test = df[df["date"] >= cutoff]

X_train, y_train = train[FEATURES], (train["target"] == "UP").astype(int)
X_test, y_test = test[FEATURES], (test["target"] == "UP").astype(int)

print(f"Cutoff date: {pd.Timestamp(cutoff).date()}")
print(f"Train: {len(train):,}  ({train['date'].min().date()} to {train['date'].max().date()})")
print(f"Test:  {len(test):,}  ({test['date'].min().date()} to {test['date'].max().date()})")
print(f"Train UP rate: {y_train.mean():.4f}")
print(f"Test UP rate:  {y_test.mean():.4f}")
print()

# ---------- Baseline ----------
majority = y_train.mode()[0]
baseline_acc = accuracy_score(y_test, np.full(len(y_test), majority))

print("=" * 60)
print(f"BASELINE (always predict {'UP' if majority == 1 else 'DOWN'})")
print(f"Accuracy: {baseline_acc:.4f}")
print()

# ---------- Random Forest ----------
rf = RandomForestClassifier(
    n_estimators=400,
    max_depth=6,
    min_samples_leaf=100,
    class_weight="balanced",
    n_jobs=-1,
    random_state=42
)
rf.fit(X_train, y_train)
rf_preds = rf.predict(X_test)
rf_acc = accuracy_score(y_test, rf_preds)

print("=" * 60)
print("RANDOM FOREST")
print(f"Accuracy: {rf_acc:.4f}   (baseline {baseline_acc:.4f})")
print(f"Predicted UP {rf_preds.mean():.1%} of the time")
print("Confusion matrix (rows=actual DOWN/UP, cols=pred DOWN/UP):")
print(confusion_matrix(y_test, rf_preds))
print()

# ---------- Logistic Regression ----------
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)

lr = LogisticRegression(max_iter=3000, class_weight="balanced")
lr.fit(X_train_s, y_train)
lr_preds = lr.predict(X_test_s)
lr_acc = accuracy_score(y_test, lr_preds)

print("=" * 60)
print("LOGISTIC REGRESSION")
print(f"Accuracy: {lr_acc:.4f}   (baseline {baseline_acc:.4f})")
print(f"Predicted UP {lr_preds.mean():.1%} of the time")
print("Confusion matrix:")
print(confusion_matrix(y_test, lr_preds))
print()

# ---------- Feature importance ----------
print("=" * 60)
print("RANDOM FOREST FEATURE IMPORTANCE")
importance = pd.Series(rf.feature_importances_, index=FEATURES).sort_values(ascending=False)
for name, val in importance.items():
    print(f"  {name:20s} {val:.4f}")
print()

# ---------- Per-ticker breakdown ----------
print("=" * 60)
print("RANDOM FOREST ACCURACY BY TICKER (test period)")
test_eval = test.copy()
test_eval["pred"] = rf_preds
test_eval["actual"] = y_test.values
test_eval["correct"] = (test_eval["pred"] == test_eval["actual"])

by_ticker = test_eval.groupby("symbol")["correct"].agg(["mean", "count"]).sort_values("mean", ascending=False)
for sym, row in by_ticker.iterrows():
    print(f"  {sym:6s} {row['mean']:.4f}  ({int(row['count'])} days)")
print()

# ---------- Summary ----------
print("=" * 60)
print("SUMMARY")
print(f"  Baseline             {baseline_acc:.4f}")
print(f"  Random Forest        {rf_acc:.4f}   ({rf_acc - baseline_acc:+.4f})")
print(f"  Logistic Regression  {lr_acc:.4f}   ({lr_acc - baseline_acc:+.4f})")

# ---------- Save results for the API ----------
import json
from datetime import datetime

results = {
    "generatedAt": datetime.now().isoformat(),
    "dataset": {
        "totalExamples": int(len(df)),
        "tickers": int(df["symbol"].nunique()),
        "startDate": str(df["date"].min().date()),
        "endDate": str(df["date"].max().date()),
        "overallUpRate": float((df["target"] == "UP").mean()),
    },
    "split": {
        "cutoffDate": str(pd.Timestamp(cutoff).date()),
        "trainSize": int(len(train)),
        "testSize": int(len(test)),
        "trainUpRate": float(y_train.mean()),
        "testUpRate": float(y_test.mean()),
    },
    "models": [
        {
            "name": "Baseline (majority class)",
            "accuracy": float(baseline_acc),
            "vsBaseline": 0.0,
            "predictedUpRate": float(majority),
        },
        {
            "name": "Random Forest",
            "accuracy": float(rf_acc),
            "vsBaseline": float(rf_acc - baseline_acc),
            "predictedUpRate": float(rf_preds.mean()),
        },
        {
            "name": "Logistic Regression",
            "accuracy": float(lr_acc),
            "vsBaseline": float(lr_acc - baseline_acc),
            "predictedUpRate": float(lr_preds.mean()),
        },
    ],
    "featureImportance": [
        {"feature": name, "importance": float(val)}
        for name, val in importance.items()
    ],
    "byTicker": [
        {"symbol": sym, "accuracy": float(row["mean"]), "days": int(row["count"])}
        for sym, row in by_ticker.iterrows()
    ],
}

output_path = "../src/main/resources/evaluation-results.json"
with open(output_path, "w") as f:
    json.dump(results, f, indent=2)

print("=" * 60)
print(f"Results written to {output_path}")