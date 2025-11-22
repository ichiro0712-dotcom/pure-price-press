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
    interval_minutes: int = Field(5, description="Check interval in minutes", ge=1, le=1440)
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
    interval_minutes: Optional[int] = Field(None, ge=1, le=1440)
    threshold_percent: Optional[float] = Field(None, ge=0.1, le=100.0)
    direction: Optional[str] = Field(None, description="Change direction ('both', 'increase', 'decrease')")
    conditions: Optional[List[MonitorCondition]] = Field(None, description="List of monitoring conditions")
    is_active: Optional[bool] = None


class MonitorTargetInDB(BaseModel):
    """Schema for monitor target from database."""
    id: int
    symbol: str
    name: Optional[str] = None
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
                    except:
                        conditions_data = None
                else:
                    conditions_data = obj.conditions_json

            data = {
                'id': obj.id,
                'symbol': obj.symbol,
                'name': obj.name,
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
