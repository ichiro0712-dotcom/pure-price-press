"""
Stock monitoring core logic for Pure Price Press.
価格こそが真実 - Price is truth.
"""
import yfinance as yf
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import requests
import os
import json

from database import SessionLocal
import crud
import schemas
import models


class StockMonitor:
    """
    Core stock monitoring system.
    Detects price volatility and triggers AI analysis.
    """

    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.discord_webhook_url = os.getenv("DISCORD_WEBHOOK_URL", "")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.monitor_enabled = os.getenv("ENABLE_MONITOR", "true").lower() == "true"

    def get_current_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get current price data for a symbol using yfinance.

        Args:
            symbol: Stock ticker symbol

        Returns:
            Dictionary with price data or None if failed
        """
        try:
            ticker = yf.Ticker(symbol)

            # Get recent data (last 2 days to ensure we have enough data)
            hist = ticker.history(period="2d", interval="1m")

            if hist.empty:
                print(f"⚠ No data available for {symbol}")
                return None

            # Get the most recent price
            current_price = hist['Close'].iloc[-1]
            volume = hist['Volume'].iloc[-1] if 'Volume' in hist.columns else None

            # Get info for market cap (may not be available for all symbols)
            try:
                info = ticker.info
                market_cap = info.get('marketCap', None)
            except:
                market_cap = None

            return {
                'price': float(current_price),
                'volume': float(volume) if volume else None,
                'market_cap': market_cap,
                'history': hist
            }

        except Exception as e:
            print(f"✗ Error fetching price for {symbol}: {e}")
            return None

    def get_price_change(
        self,
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
            ticker = yf.Ticker(symbol)

            # Determine the appropriate period based on interval
            if interval_minutes <= 60:
                period = "1d"
                interval = "1m"
            elif interval_minutes <= 1440:  # 1 day
                period = "5d"
                interval = "5m"
            else:
                period = "1mo"
                interval = "1h"

            hist = ticker.history(period=period, interval=interval)

            if hist.empty or len(hist) < 2:
                print(f"⚠ Insufficient data for {symbol}")
                return None

            # Get price from interval_minutes ago
            target_time = datetime.now() - timedelta(minutes=interval_minutes)

            # Find the closest price to the target time
            hist_with_time = hist.reset_index()
            hist_with_time['time_diff'] = abs((hist_with_time['Datetime'] - target_time).dt.total_seconds())
            closest_idx = hist_with_time['time_diff'].idxmin()

            price_before = float(hist.iloc[closest_idx]['Close'])

            # Calculate change
            change_amount = current_price - price_before
            change_rate = (change_amount / price_before) * 100

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
        self,
        symbol: str,
        change_rate: float,
        price_before: float,
        price_after: float
    ) -> str:
        """
        Analyze price movement using AI.

        Args:
            symbol: Stock ticker symbol
            change_rate: Percentage change
            price_before: Price before change
            price_after: Price after change

        Returns:
            AI analysis text
        """
        # If no API key, return placeholder
        if not self.openai_api_key:
            return f"AI分析機能は準備中です。\n{symbol}が{change_rate:+.2f}%変動しました。(${price_before:.2f} → ${price_after:.2f})"

        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.openai_api_key)

            # System prompt - Pure Price Press philosophy
            system_prompt = """あなたは『Pure Price Press』の辛口な経済記者です。
あなたの信条は『価格こそが真実であり、ニュースは見せかけに過ぎない』です。

価格の変動を事実として捉え、そこから逆算して市場参加者の真意を読み解いてください。
表面的なニュースに惑わされず、「なぜ今、金を動かしたのか？」という本質を突いた分析をしてください。

分析は3行程度で簡潔に。最後に関連市場への波及リスクについても言及してください。"""

            user_prompt = f"""銘柄: {symbol}
変動率: {change_rate:+.2f}%
価格推移: ${price_before:.2f} → ${price_after:.2f}

この価格変動の真因を分析してください。"""

            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"✗ AI analysis error: {e}")
            return f"AI分析でエラーが発生しました。\n{symbol}が{change_rate:+.2f}%変動しました。(${price_before:.2f} → ${price_after:.2f})"

    def send_discord_notification(
        self,
        symbol: str,
        change_rate: float,
        price_before: float,
        price_after: float,
        ai_analysis: str
    ) -> bool:
        """
        Send alert notification to Discord.

        Args:
            symbol: Stock ticker symbol
            change_rate: Percentage change
            price_before: Price before change
            price_after: Price after change
            ai_analysis: AI analysis text

        Returns:
            True if successful, False otherwise
        """
        if not self.discord_webhook_url:
            print("⚠ Discord webhook URL not configured")
            return False

        try:
            # Determine alert color based on change
            if change_rate > 0:
                color = 0x00FF00  # Green for positive
                direction = "📈 急騰"
            else:
                color = 0xFF0000  # Red for negative
                direction = "📉 急落"

            # Determine severity emoji
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
                    {
                        "name": "変動率",
                        "value": f"**{change_rate:+.2f}%**",
                        "inline": True
                    },
                    {
                        "name": "価格推移",
                        "value": f"${price_before:.2f} → ${price_after:.2f}",
                        "inline": True
                    },
                    {
                        "name": "変動額",
                        "value": f"${abs(price_after - price_before):.2f}",
                        "inline": True
                    },
                    {
                        "name": "📰 Pure Price Press 分析",
                        "value": ai_analysis,
                        "inline": False
                    }
                ],
                "footer": {
                    "text": "価格こそが真実 - Price is truth"
                },
                "timestamp": datetime.utcnow().isoformat()
            }

            payload = {
                "username": "Pure Price Press",
                "embeds": [embed]
            }

            response = requests.post(
                self.discord_webhook_url,
                json=payload,
                timeout=10
            )

            if response.status_code == 204:
                print(f"✓ Discord notification sent for {symbol}")
                return True
            else:
                print(f"✗ Discord notification failed: {response.status_code}")
                return False

        except Exception as e:
            print(f"✗ Discord notification error: {e}")
            return False

    def check_target(self, target: models.MonitorTarget, db: Session) -> None:
        """
        Check a single monitor target for price changes.

        Args:
            target: MonitorTarget instance
            db: Database session
        """
        print(f"Checking {target.symbol}...")

        # Get current price data
        price_data = self.get_current_price(target.symbol)
        if not price_data:
            return

        current_price = price_data['price']

        # Update last price in database
        crud.update_last_price(db, target.symbol, current_price)

        # Calculate price change
        price_change = self.get_price_change(
            target.symbol,
            current_price,
            target.interval_minutes
        )

        if not price_change:
            return

        change_rate = price_change['change_rate']

        # Get direction setting (default to 'both' for backwards compatibility)
        direction = getattr(target, 'direction', 'both')

        # Check if threshold exceeded and direction matches
        threshold_exceeded = abs(change_rate) >= target.threshold_percent

        # Check direction
        direction_matches = (
            direction == 'both' or
            (direction == 'increase' and change_rate > 0) or
            (direction == 'decrease' and change_rate < 0)
        )

        if threshold_exceeded and direction_matches:
            print(f"🚨 Alert triggered for {target.symbol}: {change_rate:+.2f}%")

            # Perform AI analysis
            ai_analysis = self.analyze_with_ai(
                target.symbol,
                change_rate,
                price_change['price_before'],
                price_change['price_after']
            )

            # Determine alert type
            if change_rate > 0:
                alert_type = "surge"
            else:
                alert_type = "drop"

            # Create alert record
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

            # Send Discord notification
            notification_success = self.send_discord_notification(
                target.symbol,
                change_rate,
                price_change['price_before'],
                price_change['price_after'],
                ai_analysis
            )

            # Mark as notified
            if notification_success:
                crud.mark_alert_notified(db, alert.id)
            else:
                crud.mark_alert_notified(db, alert.id, error="Failed to send Discord notification")

        else:
            if threshold_exceeded and not direction_matches:
                print(f"  {target.symbol}: {change_rate:+.2f}% (direction mismatch: {direction})")
            else:
                print(f"  {target.symbol}: {change_rate:+.2f}% (below threshold)")

    def run_monitoring_cycle(self) -> None:
        """
        Run one complete monitoring cycle for all active targets.
        """
        print(f"\n{'='*60}")
        print(f"Monitoring cycle started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")

        db = SessionLocal()
        try:
            # Get all active targets
            targets = crud.get_monitor_targets(db, active_only=True)

            if not targets:
                print("⚠ No active monitoring targets")
                return

            print(f"Checking {len(targets)} target(s)...")

            for target in targets:
                try:
                    self.check_target(target, db)
                except Exception as e:
                    print(f"✗ Error checking {target.symbol}: {e}")
                    continue

        except Exception as e:
            print(f"✗ Monitoring cycle error: {e}")
        finally:
            db.close()

        print(f"{'='*60}")
        print("Monitoring cycle completed")
        print(f"{'='*60}\n")

    def start(self) -> None:
        """Start the monitoring scheduler."""
        if not self.monitor_enabled:
            print("⚠ Monitoring is disabled")
            return

        interval_seconds = int(os.getenv("MONITOR_INTERVAL_SECONDS", "60"))

        self.scheduler.add_job(
            self.run_monitoring_cycle,
            'interval',
            seconds=interval_seconds,
            id='monitoring_cycle'
        )

        self.scheduler.start()
        print(f"✓ Monitoring scheduler started (interval: {interval_seconds}s)")

    def stop(self) -> None:
        """Stop the monitoring scheduler."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            print("✓ Monitoring scheduler stopped")


# Global monitor instance
_monitor_instance: Optional[StockMonitor] = None


def get_monitor() -> StockMonitor:
    """Get or create the global monitor instance."""
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = StockMonitor()
    return _monitor_instance


def start_monitor() -> None:
    """Start the stock monitor."""
    monitor = get_monitor()
    monitor.start()


def stop_monitor() -> None:
    """Stop the stock monitor."""
    monitor = get_monitor()
    monitor.stop()
