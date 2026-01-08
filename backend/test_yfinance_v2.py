#!/usr/bin/env python3
"""Test Yahoo Finance API with different approaches."""
import yfinance as yf
import time

# Test with a simple well-known ticker first
symbol = "AAPL"
print(f"\n{'='*60}")
print(f"Testing: {symbol} (Apple - should always work)")
print(f"{'='*60}")

try:
    ticker = yf.Ticker(symbol)

    # Try the simplest possible request
    hist = ticker.history(period="5d")

    if hist.empty:
        print(f"❌ No data returned")
    else:
        print(f"✓ Got {len(hist)} days of data")
        print(f"  Most recent date: {hist.index[-1]}")
        print(f"  Current price: ${hist['Close'].iloc[-1]:.2f}")
        print("\nFirst few rows:")
        print(hist.head())

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

time.sleep(2)

# Now try VIX
symbol = "^VIX"
print(f"\n{'='*60}")
print(f"Testing: {symbol}")
print(f"{'='*60}")

try:
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="5d")

    if hist.empty:
        print(f"❌ No data returned")
    else:
        print(f"✓ Got {len(hist)} days of data")
        print(f"  Most recent date: {hist.index[-1]}")
        print(f"  Current price: ${hist['Close'].iloc[-1]:.2f}")

except Exception as e:
    print(f"❌ Error: {e}")
