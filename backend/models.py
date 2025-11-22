"""
Database models for Pure Price Press.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON
from sqlalchemy.sql import func
from database import Base
from datetime import datetime


class MonitorTarget(Base):
    """
    Model for stock monitoring targets.

    Attributes:
        id: Primary key
        symbol: Stock ticker symbol (e.g., "AAPL", "TSLA", "^DJI")
        name: Display name for the stock
        interval_minutes: Monitoring interval in minutes
        threshold_percent: Alert threshold as percentage (e.g., 5.0 for 5%)
        direction: Change direction ('both', 'increase', 'decrease')
        conditions_json: JSON array of monitoring conditions (for AND/OR logic)
        is_active: Whether monitoring is active for this target
        created_at: Timestamp when target was added
        updated_at: Timestamp when target was last updated
        last_price: Last known price for this symbol
        last_check_at: Timestamp of last price check
    """
    __tablename__ = "monitor_targets"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)
    interval_minutes = Column(Integer, default=5, nullable=False)
    threshold_percent = Column(Float, default=5.0, nullable=False)
    direction = Column(String(20), default='both', nullable=False)  # 'both', 'increase', 'decrease'
    conditions_json = Column(JSON, nullable=True)  # JSON array of conditions for AND/OR logic
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_price = Column(Float, nullable=True)
    last_check_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<MonitorTarget(symbol='{self.symbol}', threshold={self.threshold_percent}%)>"


class AlertHistory(Base):
    """
    Model for price alert history.

    Attributes:
        id: Primary key
        symbol: Stock ticker symbol
        price_before: Price before the change
        price_after: Price after the change
        change_rate: Percentage change (positive or negative)
        change_amount: Absolute price change
        ai_analysis_text: AI-generated analysis of the price movement
        alert_type: Type of alert ("surge", "drop", "volatility")
        triggered_at: Timestamp when alert was triggered
        notified: Whether Discord notification was sent
        notification_error: Error message if notification failed
        volume: Trading volume at the time of alert
        market_cap: Market capitalization (if available)
        news_headlines: JSON string of related news headlines
    """
    __tablename__ = "alert_history"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), index=True, nullable=False)
    price_before = Column(Float, nullable=False)
    price_after = Column(Float, nullable=False)
    change_rate = Column(Float, nullable=False)
    change_amount = Column(Float, nullable=False)
    ai_analysis_text = Column(Text, nullable=True)
    alert_type = Column(String(20), default="volatility", nullable=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    notified = Column(Boolean, default=False, nullable=False)
    notification_error = Column(Text, nullable=True)
    volume = Column(Float, nullable=True)
    market_cap = Column(Float, nullable=True)
    news_headlines = Column(Text, nullable=True)

    def __repr__(self):
        direction = "↑" if self.change_rate > 0 else "↓"
        return f"<AlertHistory(symbol='{self.symbol}', {direction}{abs(self.change_rate):.2f}%, at={self.triggered_at})>"

    @property
    def alert_severity(self) -> str:
        """
        Calculate alert severity based on change rate.

        Returns:
            str: "critical", "high", "medium", or "low"
        """
        abs_change = abs(self.change_rate)
        if abs_change >= 10:
            return "critical"
        elif abs_change >= 7:
            return "high"
        elif abs_change >= 5:
            return "medium"
        else:
            return "low"


class SystemConfig(Base):
    """
    Model for system configuration settings.

    Attributes:
        id: Primary key
        key: Configuration key (unique)
        value: Configuration value
        description: Description of the configuration
        updated_at: Timestamp when configuration was last updated
    """
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<SystemConfig(key='{self.key}', value='{self.value[:50]}...')>"
