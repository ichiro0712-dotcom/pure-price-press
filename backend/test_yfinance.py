#!/usr/bin/env python3
"""Test Yahoo Finance API to debug data retrieval issues."""
import yfinance as yf

# Test with a few different symbols
test_symbols = ["^VIX", "^GSPC", "BTC-USD", "TSM", "^N225"]

for symbol in test_symbols:
    print(f"\n{'='*60}")
    print(f"Testing: {symbol}")
    print(f"{'='*60}")

    try:
        ticker = yf.Ticker(symbol)

        # Try to get 1 year of daily data
        hist_1y = ticker.history(period="1y", interval="1d")

        if hist_1y.empty:
            print(f"❌ No data returned for {symbol}")
        else:
            print(f"✓ Got {len(hist_1y)} days of data")
            print(f"  Most recent date: {hist_1y.index[-1]}")
            print(f"  Current price: ${hist_1y['Close'].iloc[-1]:.2f}")

            # Calculate day change if we have enough data
            if len(hist_1y) >= 2:
                price_current = float(hist_1y['Close'].iloc[-1])
                price_yesterday = float(hist_1y['Close'].iloc[-2])
                day_change = ((price_current - price_yesterday) / price_yesterday) * 100
                print(f"  Day change: {day_change:+.2f}%")

    except Exception as e:
        print(f"❌ Error: {e}")

print(f"\n{'='*60}")
print("Test complete")
print(f"{'='*60}")
