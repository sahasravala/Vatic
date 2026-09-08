import requests
import yfinance as yf


SPRING_BOOT_URL = "http://localhost:8080"


def download_history(symbol):
    print(f"Downloading 5 years of {symbol} history...")

    data = yf.download(
        symbol,
        period="5y",
        interval="1d",
        auto_adjust=True,
        progress=False
    )

    data = data.reset_index()

    # Flatten yfinance MultiIndex columns
    if hasattr(data.columns, "levels"):
        data.columns = [
            col[0] if isinstance(col, tuple) else col
            for col in data.columns
        ]

    return data


def send_to_spring_boot(symbol, data):

    records = []

    for _, row in data.iterrows():

        record = {
            "symbol": symbol.upper(),
            "date": row["Date"].strftime("%Y-%m-%d"),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
            "volume": int(row["Volume"])
        }

        records.append(record)

    url = f"{SPRING_BOOT_URL}/stocks/history/backfill"

    response = requests.post(
        url,
        json=records
    )

    response.raise_for_status()

    print(response.json())


if __name__ == "__main__":

    symbol = "NVDA"

    history = download_history(symbol)

    print(f"Downloaded {len(history)} rows.")

    send_to_spring_boot(symbol, history)