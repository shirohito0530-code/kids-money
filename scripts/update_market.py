import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


OUTPUT_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "market.json"
)


MARKETS = {
    "world": {
        "name": "全世界株式",
        "symbol": "ACWI",
        "proxy": True,
    },
    "sp": {
        "name": "S&P500",
        "symbol": "^GSPC",
        "proxy": False,
    },
}


def fetch_chart(symbol):
    encoded = urllib.parse.quote(
        symbol,
        safe=""
    )

    url = (
        "https://query1.finance.yahoo.com"
        "/v8/finance/chart/"
        + encoded
        + "?range=10y&interval=1d"
    )

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0"
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=30
    ) as response:
        return json.load(response)


def parse_series(data):
    chart = data.get("chart")

    if not chart:
        raise RuntimeError(
            "Yahoo Finance response has no chart"
        )

    results = chart.get("result")

    if not results:
        error = chart.get("error")

        raise RuntimeError(
            f"Yahoo Finance returned no result: {error}"
        )

    result = results[0]

    timestamps = result.get(
        "timestamp",
        []
    )

    indicators = result.get(
        "indicators",
        {}
    )

    quotes = indicators.get(
        "quote",
        []
    )

    if not quotes:
        raise RuntimeError(
            "Yahoo Finance response has no quote data"
        )

    closes = quotes[0].get(
        "close",
        []
    )

    series = []

    for timestamp, close in zip(
        timestamps,
        closes
    ):
        if close is None:
            continue

        dt = datetime.fromtimestamp(
            timestamp,
            timezone.utc
        )

        series.append(
            {
                "date": dt.date().isoformat(),
                "value": float(close),
            }
        )

    series.sort(
        key=lambda item: item["date"]
    )

    return series


def calculate_change(series):
    if len(series) < 2:
        return 0.0

    previous = float(
        series[-2]["value"]
    )

    latest = float(
        series[-1]["value"]
    )

    if previous == 0:
        return 0.0

    return (
        latest / previous - 1
    ) * 100


def build_market_data():
    output = {
        "version": 2,
        "updated": datetime.now(
            timezone.utc
        ).isoformat(),
        "markets": {},
    }

    for key, config in MARKETS.items():
        print(
            f"Fetching {key}: "
            f"{config['symbol']}"
        )

        data = fetch_chart(
            config["symbol"]
        )

        series = parse_series(
            data
        )

        if not series:
            raise RuntimeError(
                f"No market data: {key}"
            )

        latest = series[-1]

        change = calculate_change(
            series
        )

        output["markets"][key] = {
            "name": config["name"],
            "symbol": config["symbol"],
            "proxy": config["proxy"],
            "latest": latest,
            "change": change,
            "series": series,
        }

        print(
            f"{key}: "
            f"{latest['date']} "
            f"{latest['value']}"
        )

    return output


def main():
    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    output = build_market_data()

    with OUTPUT_FILE.open(
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            output,
            file,
            ensure_ascii=False,
            indent=2
        )

    print(
        f"Successfully wrote: "
        f"{OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()
