"""
Pydantic schemas for API request/response validation.
"""
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional


# MonitorTarget Schemas
class MonitorTargetBase(BaseModel):
    """Base schema for MonitorTarget."""
    symbol: str = Field(..., description="Stock ticker symbol", max_length=20)
    name: Optional[str] = Field(None, description="Display name", max_length=100)
    interval_minutes: int = Field(5, description="Check interval in minutes", ge=1, le=1440)
    threshold_percent: float = Field(5.0, description="Alert threshold percentage", ge=0.1, le=100.0)
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
    interval_minutes: Optional[int] = Field(None, ge=1, le=1440)
    threshold_percent: Optional[float] = Field(None, ge=0.1, le=100.0)
    is_active: Optional[bool] = None


class MonitorTargetInDB(MonitorTargetBase):
    """Schema for monitor target from database."""
    id: int
    created_at: datetime
    updated_at: datetime
    last_price: Optional[float] = None
    last_check_at: Optional[datetime] = None

    class Config:
        from_attributes = True


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
