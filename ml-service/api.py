from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

app = FastAPI(title="Vatic ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SPRING_BOOT = "http://localhost:8080"

FEATURES = [
    "return1d", "return2d", "return5d", "return10d",
    "priceVsMa5", "priceVsMa20", "ma5VsMa20",
    "volatility5", "volatility20",
    "volumeVsAvg",
    "intradayRange", "closePosition", "gapOpen",
    "marketReturn1d", "marketReturn5d",
    "excessReturn1d", "excessReturn5d",
    "relativeStrength20",
    "vixLevel", "vixChange",
]

# cache so we don't refetch 30k rows on every request
_cache = {}


def load_data(symbol: str) -> pd.DataFrame:
    key = symbol.upper()
    if key in _cache:
        return _cache[key]

    url = f"{SPRING_BOOT}/stocks/{key}/training-data"
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()

    df = pd.DataFrame(resp.json())
    if df.empty:
        raise HTTPException(404, f"No training data for {key}")

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    df = df.dropna(subset=FEATURES + ["target"])
    df["y"] = (df["target"] == "UP").astype(int)

    _cache[key] = df
    return df


def build_model(name: str):
    if name == "random_forest":
        return RandomForestClassifier(
            n_estimators=200, max_depth=5, min_samples_leaf=30,
            class_weight="balanced", n_jobs=-1, random_state=42
        ), False
    if name == "logistic_regression":
        return LogisticRegression(max_iter=2000, class_weight="balanced"), True
    raise HTTPException(400, f"Unknown model: {name}")


class BacktestRequest(BaseModel):
    symbol: str
    startDate: str
    endDate: str
    model: str = "random_forest"
    retrainEvery: int = 21
    minTrainSize: int = 250


@app.get("/health")
def health():
    return {"status": "ok", "cached": list(_cache.keys())}


@app.get("/symbols")
def symbols():
    return {"symbols": [
        "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "AMD", "INTC", "CRM", "ORCL",
        "JPM", "BAC", "GS", "V", "JNJ", "UNH", "PFE",
        "WMT", "KO", "PG", "HD", "CAT", "XOM", "CVX",
    ]}


@app.post("/backtest")
def backtest(req: BacktestRequest):
    df = load_data(req.symbol)

    start = pd.Timestamp(req.startDate)
    end = pd.Timestamp(req.endDate)

    test_mask = (df["date"] >= start) & (df["date"] <= end)
    test_idx = df.index[test_mask].tolist()

    if not test_idx:
        raise HTTPException(400, "No data in that date range")

    first_test = test_idx[0]
    if first_test < req.minTrainSize:
        raise HTTPException(
            400,
            f"Not enough history before {req.startDate}. "
            f"Need {req.minTrainSize} prior days, have {first_test}."
        )

    estimator, needs_scaling = build_model(req.model)

    results = []
    model = None
    scaler = None
    days_since_retrain = req.retrainEvery  # force a fit on the first day

    for i in test_idx:
        # ---- retrain periodically, using only data strictly before day i ----
        if days_since_retrain >= req.retrainEvery:
            train = df.iloc[:i]
            X_train = train[FEATURES]
            y_train = train["y"]

            estimator, needs_scaling = build_model(req.model)
            if needs_scaling:
                scaler = StandardScaler()
                X_train = scaler.fit_transform(X_train)
            model = estimator.fit(X_train, y_train)
            days_since_retrain = 0

        row = df.iloc[[i]]
        X = row[FEATURES]
        if needs_scaling:
            X = scaler.transform(X)

        pred = int(model.predict(X)[0])
        try:
            proba = float(model.predict_proba(X)[0][pred])
        except Exception:
            proba = 0.5

        actual = int(row["y"].iloc[0])

        results.append({
            "date": row["date"].iloc[0].strftime("%Y-%m-%d"),
            "predicted": "UP" if pred == 1 else "DOWN",
            "actual": "UP" if actual == 1 else "DOWN",
            "correct": pred == actual,
            "confidence": round(proba, 4),
        })

        days_since_retrain += 1

    preds = np.array([1 if r["predicted"] == "UP" else 0 for r in results])
    actuals = np.array([1 if r["actual"] == "UP" else 0 for r in results])

    accuracy = float((preds == actuals).mean())
    majority = int(round(actuals.mean()))
    baseline = float((actuals == majority).mean())

    # running accuracy curve for charting
    running = np.cumsum(preds == actuals) / np.arange(1, len(preds) + 1)

    return {
        "symbol": req.symbol.upper(),
        "model": req.model,
        "startDate": req.startDate,
        "endDate": req.endDate,
        "retrainEvery": req.retrainEvery,
        "totalDays": len(results),
        "correct": int((preds == actuals).sum()),
        "accuracy": round(accuracy, 4),
        "baseline": round(baseline, 4),
        "vsBaseline": round(accuracy - baseline, 4),
        "predictedUpRate": round(float(preds.mean()), 4),
        "actualUpRate": round(float(actuals.mean()), 4),
        "runningAccuracy": [
            {"date": results[i]["date"], "accuracy": round(float(running[i]), 4)}
            for i in range(len(results))
        ],
        "predictions": results,
    }