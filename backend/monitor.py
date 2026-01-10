"""
Stock monitoring core logic for Pure Price Press.
価格こそが真実 - Price is truth.

Vercel Serverless compatible version - uses direct Yahoo Finance API.
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import requests
import os
import json

from database import SessionLocal
import crud
import schemas
import models


def get_current_price(symbol: str) -> Optional[Dict[str, Any]]:
    """
    Get current price data for a symbol using Yahoo Finance API directly.

    Args:
        symbol: Stock ticker symbol

    Returns:
        Dictionary with price data or None if failed
    """
    try:
        # Use Yahoo Finance v8 API
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        params = {
            "interval": "1m",
            "range": "1d"
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        result = data.get("chart", {}).get("result", [])
        if not result:
            print(f"⚠ No data available for {symbol}")
            return None

        quote = result[0]
        meta = quote.get("meta", {})
        indicators = quote.get("indicators", {}).get("quote", [{}])[0]

        # Get the most recent price
        closes = indicators.get("close", [])
        volumes = indicators.get("volume", [])

        # Filter out None values and get last valid price
        valid_closes = [c for c in closes if c is not None]
        valid_volumes = [v for v in volumes if v is not None]

        if not valid_closes:
            print(f"⚠ No valid price data for {symbol}")
            return None

        current_price = valid_closes[-1]
        volume = valid_volumes[-1] if valid_volumes else None

        return {
            'price': float(current_price),
            'volume': float(volume) if volume else None,
            'market_cap': None,  # Not available in chart API
            'previous_close': meta.get("previousClose"),
            'currency': meta.get("currency", "USD")
        }

    except Exception as e:
        print(f"✗ Error fetching price for {symbol}: {e}")
        return None


def get_historical_prices(symbol: str) -> Optional[Dict[str, Any]]:
    """
    Get historical price data for a symbol using Yahoo Finance API directly.
    Returns current price and day/month/year change percentages.

    Args:
        symbol: Stock ticker symbol

    Returns:
        Dictionary with price data and changes or None if failed
    """
    try:
        # Use Yahoo Finance v8 API with 1 year range
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        params = {
            "interval": "1d",
            "range": "1y"
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        result = data.get("chart", {}).get("result", [])
        if not result:
            print(f"⚠ No historical data available for {symbol}")
            return None

        quote = result[0]
        indicators = quote.get("indicators", {}).get("quote", [{}])[0]

        # Get close prices
        closes = indicators.get("close", [])
        valid_closes = [c for c in closes if c is not None]

        if len(valid_closes) < 2:
            print(f"⚠ Not enough historical data for {symbol}")
            return None

        current_price = valid_closes[-1]

        # Calculate changes
        day_change = None
        month_change = None
        year_change = None

        # Day change (1 trading day ago)
        if len(valid_closes) >= 2:
            price_1d = valid_closes[-2]
            day_change = ((current_price - price_1d) / price_1d) * 100

        # Month change (approximately 21 trading days)
        if len(valid_closes) >= 22:
            price_1m = valid_closes[-22]
            month_change = ((current_price - price_1m) / price_1m) * 100

        # Year change (first available price in 1y range)
        if len(valid_closes) >= 2:
            price_1y = valid_closes[0]
            year_change = ((current_price - price_1y) / price_1y) * 100

        return {
            "current_price": float(current_price),
            "day_change": round(day_change, 2) if day_change else None,
            "month_change": round(month_change, 2) if month_change else None,
            "year_change": round(year_change, 2) if year_change else None
        }

    except Exception as e:
        print(f"✗ Error fetching historical prices for {symbol}: {e}")
        return None


def get_price_change(
    symbol: str,
    current_price: float,
    interval_minutes: int
) -> Optional[Dict[str, float]]:
    """
    Calculate price change over the specified interval.

    Args:
        symbol: Stock ticker symbol
        current_price: Current price
        interval_minutes: Time interval to compare

    Returns:
        Dictionary with price change data or None
    """
    try:
        # Determine range based on interval
        if interval_minutes <= 60:
            range_param = "1d"
            interval_param = "1m"
        elif interval_minutes <= 1440:
            range_param = "5d"
            interval_param = "5m"
        else:
            range_param = "1mo"
            interval_param = "1h"

        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        params = {
            "interval": interval_param,
            "range": range_param
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        result = data.get("chart", {}).get("result", [])
        if not result:
            return None

        quote = result[0]
        timestamps = quote.get("timestamp", [])
        indicators = quote.get("indicators", {}).get("quote", [{}])[0]
        closes = indicators.get("close", [])

        if not timestamps or not closes:
            return None

        # Find price from interval_minutes ago
        target_time = datetime.now(timezone.utc).timestamp() - (interval_minutes * 60)

        # Find closest timestamp
        closest_idx = 0
        min_diff = float('inf')
        for i, ts in enumerate(timestamps):
            if ts is not None and closes[i] is not None:
                diff = abs(ts - target_time)
                if diff < min_diff:
                    min_diff = diff
                    closest_idx = i

        price_before = closes[closest_idx]
        if price_before is None:
            return None

        price_before = float(price_before)
        change_amount = current_price - price_before
        change_rate = (change_amount / price_before) * 100 if price_before != 0 else 0

        return {
            'price_before': price_before,
            'price_after': current_price,
            'change_amount': change_amount,
            'change_rate': change_rate
        }

    except Exception as e:
        print(f"✗ Error calculating price change for {symbol}: {e}")
        return None


def analyze_with_ai(
    symbol: str,
    change_rate: float,
    price_before: float,
    price_after: float
) -> str:
    """
    Analyze price movement using Gemini AI.

    Args:
        symbol: Stock ticker symbol
        change_rate: Percentage change
        price_before: Price before change
        price_after: Price after change

    Returns:
        AI analysis text
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY", "")

    if not gemini_api_key:
        return f"AI分析機能は準備中です。\n{symbol}が{change_rate:+.2f}%変動しました。(${price_before:.2f} → ${price_after:.2f})"

    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = f"""あなたは『Pure Price Press』の辛口な経済記者です。
あなたの信条は『価格こそが真実であり、ニュースは見せかけに過ぎない』です。

銘柄: {symbol}
変動率: {change_rate:+.2f}%
価格推移: ${price_before:.2f} → ${price_after:.2f}

この価格変動の真因を3行程度で簡潔に分析してください。
最後に関連市場への波及リスクについても言及してください。"""

        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        print(f"✗ AI analysis error: {e}")
        return f"AI分析でエラーが発生しました。\n{symbol}が{change_rate:+.2f}%変動しました。(${price_before:.2f} → ${price_after:.2f})"


def send_discord_notification(
    symbol: str,
    change_rate: float,
    price_before: float,
    price_after: float,
    ai_analysis: str
) -> bool:
    """
    Send alert notification to Discord.
    """
    discord_webhook_url = os.getenv("DISCORD_WEBHOOK_URL", "")

    if not discord_webhook_url:
        print("⚠ Discord webhook URL not configured")
        return False

    try:
        if change_rate > 0:
            color = 0x00FF00
            direction = "📈 急騰"
        else:
            color = 0xFF0000
            direction = "📉 急落"

        abs_change = abs(change_rate)
        if abs_change >= 10:
            severity = "🚨 CRITICAL"
        elif abs_change >= 7:
            severity = "⚠️ HIGH"
        elif abs_change >= 5:
            severity = "📊 MEDIUM"
        else:
            severity = "ℹ️ LOW"

        embed = {
            "title": f"Pure Price Press 速報 {severity}",
            "description": f"**{symbol}** {direction}を検知しました",
            "color": color,
            "fields": [
                {"name": "変動率", "value": f"**{change_rate:+.2f}%**", "inline": True},
                {"name": "価格推移", "value": f"${price_before:.2f} → ${price_after:.2f}", "inline": True},
                {"name": "変動額", "value": f"${abs(price_after - price_before):.2f}", "inline": True},
                {"name": "📰 Pure Price Press 分析", "value": ai_analysis, "inline": False}
            ],
            "footer": {"text": "価格こそが真実 - Price is truth"},
            "timestamp": datetime.utcnow().isoformat()
        }

        payload = {"username": "Pure Price Press", "embeds": [embed]}
        response = requests.post(discord_webhook_url, json=payload, timeout=10)

        if response.status_code == 204:
            print(f"✓ Discord notification sent for {symbol}")
            return True
        else:
            print(f"✗ Discord notification failed: {response.status_code}")
            return False

    except Exception as e:
        print(f"✗ Discord notification error: {e}")
        return False


def check_target(target: models.MonitorTarget, db: Session) -> Optional[models.AlertHistory]:
    """
    Check a single monitor target for price changes.
    Returns alert if triggered, None otherwise.
    """
    print(f"Checking {target.symbol}...")

    price_data = get_current_price(target.symbol)
    if not price_data:
        return None

    current_price = price_data['price']
    crud.update_last_price(db, target.symbol, current_price)

    price_change = get_price_change(target.symbol, current_price, target.interval_minutes)
    if not price_change:
        return None

    change_rate = price_change['change_rate']
    direction = getattr(target, 'direction', 'both')

    threshold_exceeded = abs(change_rate) >= target.threshold_percent
    direction_matches = (
        direction == 'both' or
        (direction == 'increase' and change_rate > 0) or
        (direction == 'decrease' and change_rate < 0)
    )

    if threshold_exceeded and direction_matches:
        print(f"🚨 Alert triggered for {target.symbol}: {change_rate:+.2f}%")

        ai_analysis = analyze_with_ai(
            target.symbol,
            change_rate,
            price_change['price_before'],
            price_change['price_after']
        )

        alert_type = "surge" if change_rate > 0 else "drop"

        alert_data = schemas.AlertHistoryCreate(
            symbol=target.symbol,
            price_before=price_change['price_before'],
            price_after=price_change['price_after'],
            change_rate=change_rate,
            change_amount=price_change['change_amount'],
            ai_analysis_text=ai_analysis,
            alert_type=alert_type,
            volume=price_data.get('volume'),
            market_cap=price_data.get('market_cap')
        )

        alert = crud.create_alert(db, alert_data)

        notification_success = send_discord_notification(
            target.symbol,
            change_rate,
            price_change['price_before'],
            price_change['price_after'],
            ai_analysis
        )

        if notification_success:
            crud.mark_alert_notified(db, alert.id)
        else:
            crud.mark_alert_notified(db, alert.id, error="Failed to send Discord notification")

        return alert
    else:
        print(f"  {target.symbol}: {change_rate:+.2f}% (below threshold or direction mismatch)")
        return None


async def check_all_targets(db: Session) -> List[models.AlertHistory]:
    """
    Check all active targets for price changes.
    Returns list of triggered alerts.
    """
    print(f"\n{'='*60}")
    print(f"Monitoring check at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    targets = crud.get_monitor_targets(db, active_only=True)
    if not targets:
        print("⚠ No active monitoring targets")
        return []

    print(f"Checking {len(targets)} target(s)...")

    alerts = []
    for target in targets:
        try:
            alert = check_target(target, db)
            if alert:
                alerts.append(alert)
        except Exception as e:
            print(f"✗ Error checking {target.symbol}: {e}")
            continue

    print(f"{'='*60}")
    print(f"Check completed. {len(alerts)} alert(s) triggered.")
    print(f"{'='*60}\n")

    return alerts
