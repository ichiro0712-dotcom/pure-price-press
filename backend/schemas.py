"""
Pydantic schemas for API request/response validation.
"""
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List


# MonitorCondition Schema
class MonitorCondition(BaseModel):
    """Schema for a single monitoring condition."""
    interval_minutes: int = Field(..., description="Check interval in minutes", ge=1, le=10080)
    threshold_percent: float = Field(..., description="Alert threshold percentage", ge=0.1, le=100.0)
    direction: Optional[str] = Field('both', description="Change direction ('both', 'increase', 'decrease')")
    operator: Optional[str] = Field(None, description="Logical operator ('AND', 'OR'), null for first condition")


# MonitorTarget Schemas
class MonitorTargetBase(BaseModel):
    """Base schema for MonitorTarget."""
    symbol: str = Field(..., description="Stock ticker symbol", max_length=20)
    name: Optional[str] = Field(None, description="Display name", max_length=100)
    category: Optional[str] = Field(None, description="Category for grouping", max_length=100)
    interval_minutes: int = Field(5, description="Check interval in minutes", ge=1, le=5256000)
    threshold_percent: float = Field(5.0, description="Alert threshold percentage", ge=0.1, le=100.0)
    direction: str = Field('both', description="Change direction ('both', 'increase', 'decrease')")
    conditions: Optional[List[MonitorCondition]] = Field(None, description="List of monitoring conditions for AND/OR logic")
    is_active: bool = Field(True, description="Whether monitoring is active")

    @validator('symbol')
    def symbol_uppercase(cls, v):
        """Convert symbol to uppercase."""
        return v.upper().strip()


class MonitorTargetCreate(MonitorTargetBase):
    """Schema for creating a new monitor target."""
    pass


class MonitorTargetUpdate(BaseModel):
    """Schema for updating an existing monitor target."""
    name: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    interval_minutes: Optional[int] = Field(None, ge=1, le=5256000)
    threshold_percent: Optional[float] = Field(None, ge=0.1, le=100.0)
    direction: Optional[str] = Field(None, description="Change direction ('both', 'increase', 'decrease')")
    conditions: Optional[List[MonitorCondition]] = Field(None, description="List of monitoring conditions")
    is_active: Optional[bool] = None


class MonitorTargetInDB(BaseModel):
    """Schema for monitor target from database."""
    id: int
    symbol: str
    name: Optional[str] = None
    category: Optional[str] = None
    interval_minutes: int
    threshold_percent: float
    direction: str
    conditions: Optional[List[MonitorCondition]] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_price: Optional[float] = None
    last_check_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Override model_validate to handle conditions_json -> conditions mapping."""
        import json as json_module
        if hasattr(obj, '__dict__'):
            # This is an ORM object
            conditions_data = None
            if hasattr(obj, 'conditions_json') and obj.conditions_json:
                # SQLite returns JSON as string, need to parse it
                if isinstance(obj.conditions_json, str):
                    try:
                        conditions_data = json_module.loads(obj.conditions_json)
                    except (json_module.JSONDecodeError, ValueError):
                        conditions_data = None
                else:
                    conditions_data = obj.conditions_json

            data = {
                'id': obj.id,
                'symbol': obj.symbol,
                'name': obj.name,
                'category': obj.category,
                'interval_minutes': obj.interval_minutes,
                'threshold_percent': obj.threshold_percent,
                'direction': obj.direction,
                'conditions': conditions_data,
                'is_active': obj.is_active,
                'created_at': obj.created_at,
                'updated_at': obj.updated_at,
                'last_price': obj.last_price,
                'last_check_at': obj.last_check_at,
            }
            return cls(**data)
        else:
            # Regular dict validation
            return super().model_validate(obj, **kwargs)


# AlertHistory Schemas
class AlertHistoryBase(BaseModel):
    """Base schema for AlertHistory."""
    symbol: str = Field(..., description="Stock ticker symbol", max_length=20)
    price_before: float = Field(..., description="Price before change")
    price_after: float = Field(..., description="Price after change")
    change_rate: float = Field(..., description="Percentage change")
    change_amount: float = Field(..., description="Absolute price change")
    ai_analysis_text: Optional[str] = Field(None, description="AI analysis")
    alert_type: str = Field("volatility", description="Type of alert")
    volume: Optional[float] = Field(None, description="Trading volume")
    market_cap: Optional[float] = Field(None, description="Market capitalization")
    news_headlines: Optional[str] = Field(None, description="Related news headlines (JSON)")


class AlertHistoryCreate(AlertHistoryBase):
    """Schema for creating a new alert."""
    pass


class AlertHistoryInDB(AlertHistoryBase):
    """Schema for alert history from database."""
    id: int
    triggered_at: datetime
    notified: bool
    notification_error: Optional[str] = None

    class Config:
        from_attributes = True


# SystemConfig Schemas
class SystemConfigBase(BaseModel):
    """Base schema for SystemConfig."""
    key: str = Field(..., description="Configuration key", max_length=100)
    value: str = Field(..., description="Configuration value")
    description: Optional[str] = Field(None, description="Description", max_length=255)


class SystemConfigCreate(SystemConfigBase):
    """Schema for creating a new system config."""
    pass


class SystemConfigUpdate(BaseModel):
    """Schema for updating system config."""
    value: str = Field(..., description="Configuration value")
    description: Optional[str] = Field(None, max_length=255)


class SystemConfigInDB(SystemConfigBase):
    """Schema for system config from database."""
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True


class SystemConfigPublic(BaseModel):
    """Schema for system config returned to frontend (with masked sensitive values)."""
    id: int
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime
    is_set: bool = True  # 値が設定されているかどうか

    class Config:
        from_attributes = True

    @classmethod
    def from_config(cls, config) -> "SystemConfigPublic":
        """Create a public config with masked sensitive values."""
        sensitive_keys = {"openai_api_key", "discord_webhook_url", "alpha_vantage_api_key", "vapid_private_key"}

        value = config.value
        is_set = bool(value and value.strip())

        if config.key in sensitive_keys and is_set:
            # マスク表示（最初と最後の数文字のみ表示）
            if len(value) > 8:
                value = value[:4] + "..." + value[-4:]
            else:
                value = "****"

        return cls(
            id=config.id,
            key=config.key,
            value=value,
            description=config.description,
            updated_at=config.updated_at,
            is_set=is_set
        )


# Response Schemas
class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response."""
    detail: str
    error_code: Optional[str] = None


# Dashboard Schemas
class DashboardStats(BaseModel):
    """Dashboard statistics."""
    total_targets: int
    active_targets: int
    total_alerts: int
    alerts_today: int
    critical_alerts: int


class PriceUpdate(BaseModel):
    """Real-time price update."""
    symbol: str
    price: float
    change_rate: float
    timestamp: datetime
    volume: Optional[float] = None


# PushSubscription Schemas
class PushSubscriptionKeys(BaseModel):
    """Keys for push subscription."""
    p256dh: str = Field(..., description="Client public key")
    auth: str = Field(..., description="Authentication secret")


class PushSubscriptionCreate(BaseModel):
    """Schema for creating a push subscription."""
    endpoint: str = Field(..., description="Push service endpoint URL")
    keys: PushSubscriptionKeys = Field(..., description="Subscription keys")
    expirationTime: Optional[int] = Field(None, description="Expiration time (unused)")


class PushSubscriptionInDB(BaseModel):
    """Schema for push subscription from database."""
    id: int
    endpoint: str
    p256dh: str
    auth: str
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PushUnsubscribe(BaseModel):
    """Schema for unsubscribing from push notifications."""
    endpoint: str = Field(..., description="Push service endpoint URL to unsubscribe")


class VapidPublicKey(BaseModel):
    """VAPID public key response."""
    publicKey: str


# ==============================================================================
# News Feature Schemas
# ==============================================================================

class SymbolImpact(BaseModel):
    """Schema for per-symbol impact analysis."""
    direction: Optional[str] = None  # positive, negative, mixed, uncertain
    analysis: Optional[str] = None  # AI analysis of impact on this symbol


class CuratedNewsResponse(BaseModel):
    """Schema for curated news item response."""
    id: int
    title: str
    url: str
    source: str
    region: str
    category: Optional[str] = None
    published_at: Optional[datetime] = None  # Original article publication time
    source_count: int = 1  # Number of sources reporting this news
    related_sources: Optional[List[str]] = None  # Other sources reporting same news
    importance_score: float
    relevance_reason: str
    ai_summary: Optional[str] = None  # AI-generated article summary
    affected_symbols: Optional[List[str]] = None
    symbol_impacts: Optional[dict] = None  # Per-symbol impact analysis {"AAPL": {"direction": "positive", "analysis": "..."}}
    predicted_impact: Optional[str] = None
    impact_direction: Optional[str] = None
    supply_chain_impact: Optional[str] = None
    competitor_impact: Optional[str] = None
    verification_passed: bool = True
    digest_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class DailyDigestResponse(BaseModel):
    """Schema for daily digest response."""
    id: int
    digest_date: datetime
    total_raw_news: int
    total_merged_news: int
    total_curated_news: int
    processing_time_seconds: Optional[float] = None
    regional_distribution: Optional[dict] = None
    category_distribution: Optional[dict] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NewsListResponse(BaseModel):
    """Schema for news list response."""
    news: List[CuratedNewsResponse]
    digest: Optional[DailyDigestResponse] = None
    total_count: int


class NewsBatchRunRequest(BaseModel):
    """Schema for triggering a news batch run."""
    hours_back: int = Field(24, ge=1, le=72, description="Hours to look back for news")


class NewsBatchRunResponse(BaseModel):
    """Schema for news batch run response."""
    batch_id: str
    status: str
    message: str
    processing_time_seconds: Optional[float] = None
    total_collected: Optional[int] = None
    total_curated: Optional[int] = None
