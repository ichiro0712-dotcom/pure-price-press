"""
API routes for Pure Price Press.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import crud
import schemas
from database import get_db

router = APIRouter()


# MonitorTarget Routes
@router.get("/targets", response_model=List[schemas.MonitorTargetInDB])
async def get_monitor_targets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Get all monitor targets.

    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    - **active_only**: Filter to only active targets
    """
    try:
        targets = crud.get_monitor_targets(db, skip=skip, limit=limit, active_only=active_only)
        return [schemas.MonitorTargetInDB.model_validate(t) for t in targets]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch targets: {str(e)}")


@router.get("/targets/{target_id}", response_model=schemas.MonitorTargetInDB)
async def get_monitor_target(
    target_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific monitor target by ID."""
    target = crud.get_monitor_target(db, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return schemas.MonitorTargetInDB.model_validate(target)


@router.post("/targets", response_model=schemas.MonitorTargetInDB, status_code=201)
async def create_monitor_target(
    target: schemas.MonitorTargetCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new monitor target.

    - **symbol**: Stock ticker symbol (e.g., "AAPL", "TSLA")
    - **interval_minutes**: How often to check (default: 5)
    - **threshold_percent**: Alert threshold percentage (default: 5.0)
    """
    # Check if symbol already exists
    existing = crud.get_monitor_target_by_symbol(db, target.symbol)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Target for symbol '{target.symbol}' already exists"
        )

    try:
        created_target = crud.create_monitor_target(db, target)
        return schemas.MonitorTargetInDB.model_validate(created_target)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create target: {str(e)}")


@router.patch("/targets/{target_id}", response_model=schemas.MonitorTargetInDB)
async def update_monitor_target(
    target_id: int,
    target_update: schemas.MonitorTargetUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing monitor target."""
    try:
        updated_target = crud.update_monitor_target(db, target_id, target_update)
        if not updated_target:
            raise HTTPException(status_code=404, detail="Target not found")
        return schemas.MonitorTargetInDB.model_validate(updated_target)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update target: {str(e)}")


@router.delete("/targets/{target_id}", response_model=schemas.MessageResponse)
async def delete_monitor_target(
    target_id: int,
    db: Session = Depends(get_db)
):
    """Delete a monitor target."""
    try:
        success = crud.delete_monitor_target(db, target_id)
        if not success:
            raise HTTPException(status_code=404, detail="Target not found")
        return schemas.MessageResponse(message=f"Target {target_id} deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete target: {str(e)}")


# AlertHistory Routes
@router.get("/alerts", response_model=List[schemas.AlertHistoryInDB])
async def get_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    symbol: Optional[str] = Query(None),
    days: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db)
):
    """
    Get alert history.

    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    - **symbol**: Filter by stock symbol
    - **days**: Filter to alerts from the last N days
    """
    try:
        alerts = crud.get_alerts(db, skip=skip, limit=limit, symbol=symbol, days=days)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")


@router.get("/alerts/{alert_id}", response_model=schemas.AlertHistoryInDB)
async def get_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific alert by ID."""
    alert = crud.get_alert(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/alerts", response_model=schemas.AlertHistoryInDB, status_code=201)
async def create_alert(
    alert: schemas.AlertHistoryCreate,
    db: Session = Depends(get_db)
):
    """Create a new alert (typically called by monitor service)."""
    try:
        return crud.create_alert(db, alert)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")


@router.delete("/alerts/{alert_id}", response_model=schemas.MessageResponse)
async def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Delete an alert."""
    try:
        success = crud.delete_alert(db, alert_id)
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        return schemas.MessageResponse(message=f"Alert {alert_id} deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete alert: {str(e)}")


# SystemConfig Routes
@router.get("/config", response_model=List[schemas.SystemConfigInDB])
async def get_all_configs(db: Session = Depends(get_db)):
    """Get all system configurations."""
    try:
        return crud.get_all_configs(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch configs: {str(e)}")


@router.get("/config/{key}", response_model=schemas.SystemConfigInDB)
async def get_config(
    key: str,
    db: Session = Depends(get_db)
):
    """Get a specific system configuration."""
    config = crud.get_config(db, key)
    if not config:
        raise HTTPException(status_code=404, detail=f"Config '{key}' not found")
    return config


@router.put("/config/{key}", response_model=schemas.SystemConfigInDB)
async def set_config(
    key: str,
    config_update: schemas.SystemConfigUpdate,
    db: Session = Depends(get_db)
):
    """Set or update a system configuration."""
    try:
        return crud.set_config(
            db,
            key=key,
            value=config_update.value,
            description=config_update.description
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set config: {str(e)}")


@router.delete("/config/{key}", response_model=schemas.MessageResponse)
async def delete_config(
    key: str,
    db: Session = Depends(get_db)
):
    """Delete a system configuration."""
    try:
        success = crud.delete_config(db, key)
        if not success:
            raise HTTPException(status_code=404, detail=f"Config '{key}' not found")
        return schemas.MessageResponse(message=f"Config '{key}' deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete config: {str(e)}")


# Dashboard Routes
@router.get("/dashboard/stats", response_model=schemas.DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics."""
    try:
        all_targets = crud.get_monitor_targets(db)
        active_targets = crud.get_monitor_targets(db, active_only=True)

        return schemas.DashboardStats(
            total_targets=len(all_targets),
            active_targets=len(active_targets),
            total_alerts=crud.get_alerts_count(db),
            alerts_today=crud.get_alerts_count(db, days=1),
            critical_alerts=crud.get_critical_alerts_count(db, days=1)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


# Price Data Routes
@router.get("/targets/{target_id}/price")
async def get_target_price(
    target_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current price and comparison data for a target.
    Returns current price, day/month/year change percentages.
    """
    from monitor import StockMonitor
    import yfinance as yf
    from datetime import datetime, timedelta

    # Get target
    target = crud.get_monitor_target(db, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    try:
        ticker = yf.Ticker(target.symbol)

        # Get historical data for comparisons (use daily data which is more reliable)
        hist_1y = ticker.history(period="1y", interval="1d")

        if hist_1y.empty or len(hist_1y) < 2:
            return {
                "symbol": target.symbol,
                "current_price": None,
                "day_change": None,
                "month_change": None,
                "year_change": None,
                "error": "No data available"
            }

        # Get current price (most recent close)
        current_price = float(hist_1y['Close'].iloc[-1])

        # Calculate changes
        day_change = None
        month_change = None
        year_change = None

        # Day change (1 trading day ago)
        if len(hist_1y) >= 2:
            price_1d = float(hist_1y['Close'].iloc[-2])
            day_change = ((current_price - price_1d) / price_1d) * 100

        # Month change (approximately 21 trading days)
        if len(hist_1y) >= 22:
            price_1m = float(hist_1y['Close'].iloc[-22])
            month_change = ((current_price - price_1m) / price_1m) * 100

        # Year change (approximately 252 trading days or earliest available)
        if len(hist_1y) >= 2:
            price_1y = float(hist_1y['Close'].iloc[0])
            year_change = ((current_price - price_1y) / price_1y) * 100

        return {
            "symbol": target.symbol,
            "current_price": current_price,
            "day_change": day_change,
            "month_change": month_change,
            "year_change": year_change
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch price data: {str(e)}")


# Health Check
@router.get("/health", response_model=schemas.MessageResponse)
async def health_check():
    """Health check endpoint."""
    return schemas.MessageResponse(message="Pure Price Press API is running")
