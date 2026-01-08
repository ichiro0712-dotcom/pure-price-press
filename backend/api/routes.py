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


@router.post("/targets/reorder", response_model=schemas.MessageResponse)
async def reorder_targets(
    target_ids: List[int],
    db: Session = Depends(get_db)
):
    """
    Reorder monitor targets by providing a list of target IDs in the desired order.

    - **target_ids**: List of target IDs in the new display order
    """
    try:
        success = crud.reorder_monitor_targets(db, target_ids)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to reorder targets")
        return schemas.MessageResponse(message="Targets reordered successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reorder targets: {str(e)}")


@router.get("/categories", response_model=List[str])
async def get_categories(db: Session = Depends(get_db)):
    """Get all unique categories from monitor targets."""
    try:
        return crud.get_categories(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch categories: {str(e)}")


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
@router.get("/config", response_model=List[schemas.SystemConfigPublic])
async def get_all_configs(db: Session = Depends(get_db)):
    """Get all system configurations (with sensitive values masked)."""
    try:
        configs = crud.get_all_configs(db)
        return [schemas.SystemConfigPublic.from_config(c) for c in configs]
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


# Check New Alerts (for polling/push notification)
@router.get("/alerts/check-new", response_model=List[schemas.AlertHistoryInDB])
async def check_new_alerts(
    since: Optional[str] = Query(None, description="ISO format timestamp to check alerts since"),
    db: Session = Depends(get_db)
):
    """
    Check for new alerts since a given timestamp.
    Used by frontend for polling or Service Worker for push notifications.

    - **since**: ISO format timestamp (e.g., "2024-01-01T00:00:00Z")
    """
    from datetime import datetime
    try:
        if since:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            alerts = crud.get_alerts_since(db, since_dt)
        else:
            # If no since provided, get alerts from last 5 minutes
            from datetime import timedelta
            since_dt = datetime.utcnow() - timedelta(minutes=5)
            alerts = crud.get_alerts_since(db, since_dt)
        return alerts
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check new alerts: {str(e)}")


# Push Notification Routes
@router.post("/push/subscribe", response_model=schemas.MessageResponse)
async def subscribe_push(
    subscription: schemas.PushSubscriptionCreate,
    db: Session = Depends(get_db)
):
    """
    Subscribe to push notifications.
    Stores the push subscription for later use.
    """
    try:
        crud.create_push_subscription(
            db,
            endpoint=subscription.endpoint,
            p256dh=subscription.keys.p256dh,
            auth=subscription.keys.auth
        )
        return schemas.MessageResponse(message="Successfully subscribed to push notifications")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to subscribe: {str(e)}")


@router.delete("/push/unsubscribe", response_model=schemas.MessageResponse)
async def unsubscribe_push(
    unsubscribe: schemas.PushUnsubscribe,
    db: Session = Depends(get_db)
):
    """
    Unsubscribe from push notifications.
    Removes the push subscription from the database.
    """
    try:
        success = crud.delete_push_subscription(db, unsubscribe.endpoint)
        if not success:
            raise HTTPException(status_code=404, detail="Subscription not found")
        return schemas.MessageResponse(message="Successfully unsubscribed from push notifications")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unsubscribe: {str(e)}")


@router.get("/push/vapid-public-key", response_model=schemas.VapidPublicKey)
async def get_vapid_public_key(db: Session = Depends(get_db)):
    """
    Get the VAPID public key for push subscription.
    The public key is required by the browser to subscribe to push notifications.
    """
    # Get from system config or use default
    config = crud.get_config(db, "vapid_public_key")
    if config:
        return schemas.VapidPublicKey(publicKey=config.value)

    # If no VAPID key configured, return placeholder
    # In production, you should generate VAPID keys and store them
    return schemas.VapidPublicKey(
        publicKey="BPlaceholder-VAPID-Key-Replace-With-Real-Generated-Key"
    )


# Health Check
@router.get("/health", response_model=schemas.MessageResponse)
async def health_check():
    """Health check endpoint."""
    return schemas.MessageResponse(message="Pure Price Press API is running")
