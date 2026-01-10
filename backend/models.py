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
    category = Column(String(100), nullable=True, index=True)  # Category for grouping
    interval_minutes = Column(Integer, default=5, nullable=False)
    threshold_percent = Column(Float, default=5.0, nullable=False)
    direction = Column(String(20), default='both', nullable=False)  # 'both', 'increase', 'decrease'
    conditions_json = Column(JSON, nullable=True)  # JSON array of conditions for AND/OR logic
    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)  # Display order for sorting
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


class PushSubscription(Base):
    """
    Model for Web Push notification subscriptions.

    Attributes:
        id: Primary key
        endpoint: Push service endpoint URL (unique)
        p256dh: Client public key for encryption
        auth: Authentication secret
        created_at: Timestamp when subscription was created
        last_used_at: Timestamp when subscription was last used for notification
    """
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(Text, unique=True, index=True, nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<PushSubscription(id={self.id}, endpoint='{self.endpoint[:50]}...')>"


# ==============================================================================
# News Feature Models
# ==============================================================================

class RawNews(Base):
    """
    Model for raw news articles collected from various sources.

    Attributes:
        id: Primary key (UUID string)
        title: Article title
        url: Original article URL
        source: News source name (Reuters, Bloomberg, etc.)
        region: Geographic region (north_america, europe, asia, etc.)
        category: News category (finance, technology, etc.)
        published_at: Article publication time
        summary: Article summary (if available)
        fetched_at: When this article was fetched
        batch_id: Batch processing ID for tracking
    """
    __tablename__ = "raw_news"

    id = Column(String(36), primary_key=True)  # UUID
    title = Column(String(500), nullable=False)
    url = Column(String(2000), unique=True, nullable=False)
    source = Column(String(100), nullable=False, index=True)
    region = Column(String(50), nullable=False, index=True)
    category = Column(String(50), nullable=True, index=True)
    published_at = Column(DateTime(timezone=True), nullable=False, index=True)
    summary = Column(Text, nullable=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    batch_id = Column(String(36), nullable=False, index=True)

    def __repr__(self):
        return f"<RawNews(source='{self.source}', title='{self.title[:50]}...')>"


class MergedNews(Base):
    """
    Model for deduplicated/merged news articles.

    After clustering similar articles, this table stores the representative article
    with information about related sources.

    Attributes:
        id: Primary key (UUID string)
        title: Representative article title
        url: Representative article URL
        source: Primary source name
        region: Geographic region
        category: News category
        published_at: Publication time
        summary: Article summary
        related_sources: JSON array of other sources reporting same news
        source_count: Number of sources reporting this news
        importance_boost: Multiplier based on source count
        embedding_vector: Sentence embedding for similarity matching (stored as JSON)
        batch_id: Batch processing ID
    """
    __tablename__ = "merged_news"

    id = Column(String(36), primary_key=True)  # UUID
    title = Column(String(500), nullable=False)
    url = Column(String(2000), nullable=False)
    source = Column(String(100), nullable=False, index=True)
    region = Column(String(50), nullable=False, index=True)
    category = Column(String(50), nullable=True, index=True)
    published_at = Column(DateTime(timezone=True), nullable=False, index=True)
    summary = Column(Text, nullable=True)
    related_sources = Column(JSON, nullable=True)  # ["Bloomberg", "CNBC"]
    source_count = Column(Integer, default=1, nullable=False)
    importance_boost = Column(Float, default=1.0, nullable=False)
    embedding_vector = Column(JSON, nullable=True)  # Store as list of floats
    batch_id = Column(String(36), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<MergedNews(source='{self.source}', sources={self.source_count}, title='{self.title[:40]}...')>"


class DailyDigest(Base):
    """
    Model for daily digest containing aggregated analysis results.

    Stores the overall daily summary and metadata about the analysis run.

    Attributes:
        id: Primary key
        digest_date: Date of this digest
        total_raw_news: Number of raw news collected
        total_merged_news: Number after deduplication
        total_curated_news: Number of final curated news
        processing_time_seconds: Total processing time
        llm_cost_estimate: Estimated LLM API cost
        regional_distribution: JSON with news count by region
        category_distribution: JSON with news count by category
        status: Processing status (pending, processing, completed, failed)
        error_message: Error message if failed
        created_at: When this digest was created
    """
    __tablename__ = "daily_digest"

    id = Column(Integer, primary_key=True, index=True)
    digest_date = Column(DateTime(timezone=True), unique=True, nullable=False, index=True)
    total_raw_news = Column(Integer, default=0, nullable=False)
    total_merged_news = Column(Integer, default=0, nullable=False)
    total_curated_news = Column(Integer, default=0, nullable=False)
    processing_time_seconds = Column(Float, nullable=True)
    llm_cost_estimate = Column(Float, nullable=True)
    regional_distribution = Column(JSON, nullable=True)
    category_distribution = Column(JSON, nullable=True)
    status = Column(String(20), default="pending", nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<DailyDigest(date={self.digest_date}, curated={self.total_curated_news}, status='{self.status}')>"


class CuratedNews(Base):
    """
    Model for final curated news items with full analysis.

    Contains news that passed all LLM analysis stages with importance scores
    and detailed analysis.

    Attributes:
        id: Primary key
        merged_news_id: Reference to merged news item
        digest_date: Date of the digest this belongs to
        title: Article title
        url: Article URL
        source: Primary source
        region: Geographic region
        category: News category
        published_at: Original article publication time
        source_count: Number of sources reporting this news
        related_sources: JSON array of other source names reporting same news
        importance_score: Final importance score (1-10)
        relevance_reason: Why this news is important
        ai_summary: AI-generated summary of the article
        affected_symbols: JSON array of affected stock symbols
        symbol_impacts: JSON object with per-symbol impact analysis
        predicted_impact: Predicted market impact description
        impact_direction: Expected direction (positive, negative, mixed, uncertain)
        supply_chain_impact: Analysis of supply chain effects
        competitor_impact: Analysis of competitor effects
        verification_passed: Whether correlation verification passed
        verification_details: JSON with verification results
        analysis_stage_1: Screening analysis
        analysis_stage_2: Deep analysis
        analysis_stage_3: Verification analysis
        analysis_stage_4: Final judgment
        created_at: When this was created
    """
    __tablename__ = "curated_news"

    id = Column(Integer, primary_key=True, index=True)
    merged_news_id = Column(String(36), nullable=False, index=True)
    digest_date = Column(DateTime(timezone=True), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    url = Column(String(2000), nullable=False)
    source = Column(String(100), nullable=False)
    region = Column(String(50), nullable=False)
    category = Column(String(50), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True, index=True)  # Original publication time
    source_count = Column(Integer, default=1, nullable=False)  # Number of sources reporting
    related_sources = Column(JSON, nullable=True)  # ["Bloomberg", "CNBC", "Reuters"]
    importance_score = Column(Float, nullable=False, index=True)  # 1-10
    relevance_reason = Column(Text, nullable=False)
    ai_summary = Column(Text, nullable=True)  # AI-generated article summary
    affected_symbols = Column(JSON, nullable=True)  # ["AAPL", "TSM", "NVDA"]
    symbol_impacts = Column(JSON, nullable=True)  # {"AAPL": {"direction": "positive", "analysis": "..."}, ...}
    predicted_impact = Column(Text, nullable=True)
    impact_direction = Column(String(20), nullable=True)  # positive, negative, mixed, uncertain
    supply_chain_impact = Column(Text, nullable=True)
    competitor_impact = Column(Text, nullable=True)
    verification_passed = Column(Boolean, default=True, nullable=False)
    verification_details = Column(JSON, nullable=True)
    analysis_stage_1 = Column(JSON, nullable=True)  # Screening result
    analysis_stage_2 = Column(JSON, nullable=True)  # Deep analysis result
    analysis_stage_3 = Column(JSON, nullable=True)  # Verification result
    analysis_stage_4 = Column(JSON, nullable=True)  # Final judgment
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<CuratedNews(score={self.importance_score}, title='{self.title[:40]}...')>"


class VerificationLog(Base):
    """
    Model for logging LLM analysis verification results.

    Tracks predictions vs actual outcomes for continuous improvement.

    Attributes:
        id: Primary key
        curated_news_id: Reference to curated news
        predicted_symbols: Symbols LLM predicted would be affected
        predicted_direction: Predicted price direction
        actual_symbols_moved: Symbols that actually moved significantly
        actual_direction: Actual price direction observed
        prediction_accuracy: Accuracy score (0-1)
        verification_notes: Additional notes
        verified_at: When verification was performed
    """
    __tablename__ = "verification_log"

    id = Column(Integer, primary_key=True, index=True)
    curated_news_id = Column(Integer, nullable=False, index=True)
    predicted_symbols = Column(JSON, nullable=True)
    predicted_direction = Column(String(20), nullable=True)
    actual_symbols_moved = Column(JSON, nullable=True)
    actual_direction = Column(String(20), nullable=True)
    prediction_accuracy = Column(Float, nullable=True)
    verification_notes = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<VerificationLog(news_id={self.curated_news_id}, accuracy={self.prediction_accuracy})>"
