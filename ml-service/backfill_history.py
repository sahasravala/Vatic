import requests
import yfinance as yf
import time

SPRING_BOOT_URL = "http://localhost:8080"

# Diversified across sectors so we're not just capturing one regime
TICKERS = [
    # Tech
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "AMD", "INTC", "CRM", "ORCL",
    # Financials
    "JPM", "BAC", "GS", "V",
    # Healthcare
    "JNJ", "UNH", "PFE",
    # Consumer / Industrial / Energy
    "WMT", "KO", "PG", "HD", "CAT", "XOM", "CVX",
    # Market context
    "SPY", "QQQ", "^VIX",
]


def download_history(symbol):
    data = yf.download(
        symbol,
        period="5y",
        interval="1d",
        auto_adjust=True,
        progress=False
    )

    if data.empty:
        return None

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
        # VIX has no volume; default to 0
        try:
            volume = int(row["Volume"])
        except (KeyError, ValueError, TypeError):
            volume = 0

        records.append({
            "symbol": symbol.upper().replace("^", ""),
            "date": row["Date"].strftime("%Y-%m-%d"),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
            "volume": volume
        })

    response = requests.post(
        f"{SPRING_BOOT_URL}/stocks/history/backfill",
        json=records
    )
    response.raise_for_status()
    return response.json()


if __name__ == "__main__":

    total_inserted = 0
    failed = []

    for i, symbol in enumerate(TICKERS, 1):
        print(f"[{i}/{len(TICKERS)}] {symbol:6s} ", end="", flush=True)

        try:
            history = download_history(symbol)

            if history is None or len(history) == 0:
                print("no data returned")
                failed.append(symbol)
                continue

            result = send_to_spring_boot(symbol, history)
            inserted = result.get("inserted", 0)
            total_inserted += inserted

            print(f"downloaded {len(history):5d}  inserted {inserted:5d}")

        except Exception as e:
            print(f"FAILED — {e}")
            failed.append(symbol)

        # be polite to yfinance
        time.sleep(1)

    print()
    print("=" * 50)
    print(f"Tickers processed: {len(TICKERS) - len(failed)}/{len(TICKERS)}")
    print(f"Total rows inserted: {total_inserted}")
    if failed:
        print(f"Failed: {', '.join(failed)}")