import requests
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler


SPRING_BOOT_URL = "http://localhost:8080"

FEATURE_COLUMNS = [
    "dailyReturn",
    "movingAverage5",
    "movingAverage20",
    "momentum5",
    "volatility20",
    "volumeChange"
]


def load_training_data(symbol):
    url = f"{SPRING_BOOT_URL}/stocks/{symbol}/training-data"

    response = requests.get(url)
    response.raise_for_status()

    data = response.json()

    df = pd.DataFrame(data)

    df["date"] = pd.to_datetime(df["date"])

    # Very important:
    # oldest observations first, newest observations last
    df = df.sort_values("date").reset_index(drop=True)

    return df


def train_model(df):
    X = df[FEATURE_COLUMNS]
    y = df["target"]

    split_index = int(len(df) * 0.80)

    X_train = X.iloc[:split_index]
    X_test = X.iloc[split_index:]
    y_train = y.iloc[:split_index]
    y_test = y.iloc[split_index:]

    print(f"Training examples: {len(X_train)}")
    print(f"Testing examples: {len(X_test)}")
    print()

    # -------------------------
    # Baseline
    # -------------------------

    baseline = DummyClassifier(strategy="most_frequent")
    baseline.fit(X_train, y_train)

    baseline_predictions = baseline.predict(X_test)

    baseline_accuracy = accuracy_score(
        y_test,
        baseline_predictions
    )

    # -------------------------
    # Random Forest
    # -------------------------

    random_forest = RandomForestClassifier(
        n_estimators=200,
        max_depth=5,
        random_state=42
    )

    random_forest.fit(X_train, y_train)

    rf_predictions = random_forest.predict(X_test)

    rf_accuracy = accuracy_score(
        y_test,
        rf_predictions
    )

    # -------------------------
    # Logistic Regression
    # -------------------------

    scaler = StandardScaler()

    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    logistic_regression = LogisticRegression(
        max_iter=1000,
        random_state=42
    )

    logistic_regression.fit(
        X_train_scaled,
        y_train
    )

    lr_predictions = logistic_regression.predict(
        X_test_scaled
    )

    lr_accuracy = accuracy_score(
        y_test,
        lr_predictions
    )

    # -------------------------
    # Results
    # -------------------------

    print(f"Baseline accuracy:            {baseline_accuracy:.2%}")
    print(f"Random Forest accuracy:       {rf_accuracy:.2%}")
    print(f"Logistic Regression accuracy: {lr_accuracy:.2%}")
    print()

    print("Random Forest:")
    print(
        classification_report(
            y_test,
            rf_predictions,
            zero_division=0
        )
    )

    print("Logistic Regression:")
    print(
        classification_report(
            y_test,
            lr_predictions,
            zero_division=0
        )
    )

    return random_forest


if __name__ == "__main__":

    training_data = load_training_data("NVDA")

    print(f"Total examples: {len(training_data)}")
    print()

    model = train_model(training_data)