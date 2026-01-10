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
    from monitor import get_historical_prices
    from datetime import datetime, timedelta

    # Get target
    target = crud.get_monitor_target(db, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    try:
        # Get historical data using direct Yahoo Finance API
        price_data = get_historical_prices(target.symbol)

        if not price_data or "current_price" not in price_data:
            return {
                "symbol": target.symbol,
                "current_price": None,
                "day_change": None,
                "month_change": None,
                "year_change": None,
                "error": "No data available"
            }

        return {
            "symbol": target.symbol,
            "current_price": price_data.get("current_price"),
            "day_change": price_data.get("day_change"),
            "month_change": price_data.get("month_change"),
            "year_change": price_data.get("year_change")
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


# ==============================================================================
# News Feature Routes
# ==============================================================================

@router.get("/news", response_model=schemas.NewsListResponse)
async def get_curated_news(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    min_score: float = Query(0.0, ge=0.0, le=10.0),
    translate: bool = Query(True, description="Translate content to Japanese"),
    db: Session = Depends(get_db)
):
    """
    Get curated news from today's digest.

    - **limit**: Maximum number of news items to return
    - **offset**: Number of items to skip (pagination)
    - **min_score**: Minimum importance score filter
    - **translate**: Translate content to Japanese (default: true)
    """
    from models import CuratedNews, DailyDigest
    from datetime import datetime, timezone, timedelta

    try:
        # Get today's digest date (start of day UTC)
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # Query curated news
        query = db.query(CuratedNews).filter(
            CuratedNews.digest_date >= today - timedelta(days=1),
            CuratedNews.importance_score >= min_score
        ).order_by(CuratedNews.importance_score.desc())

        total_count = query.count()
        news_items = query.offset(offset).limit(limit).all()

        # Get latest digest
        digest = db.query(DailyDigest).order_by(
            DailyDigest.digest_date.desc()
        ).first()

        # Convert to response models
        news_responses = [schemas.CuratedNewsResponse.model_validate(n) for n in news_items]

        # Translate if requested
        if translate and news_responses:
            try:
                from services.news.translator import get_translator
                translator = get_translator()

                for response in news_responses:
                    if response.title:
                        response.title = translator.translate_text(response.title)
                    if response.relevance_reason:
                        response.relevance_reason = translator.translate_text(response.relevance_reason)
            except Exception as e:
                print(f"Translation error in news list: {e}")
                # Continue with untranslated content

        return schemas.NewsListResponse(
            news=news_responses,
            digest=schemas.DailyDigestResponse.model_validate(digest) if digest else None,
            total_count=total_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")


@router.get("/news/{news_id}", response_model=schemas.CuratedNewsResponse)
async def get_news_detail(
    news_id: int,
    translate: bool = Query(True, description="Translate content to Japanese"),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific news item."""
    from models import CuratedNews

    news = db.query(CuratedNews).filter(CuratedNews.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    response = schemas.CuratedNewsResponse.model_validate(news)

    # Translate if requested
    if translate:
        try:
            from services.news.translator import get_translator
            translator = get_translator()

            # Translate text fields
            if response.title:
                response.title = translator.translate_text(response.title)
            if response.relevance_reason:
                response.relevance_reason = translator.translate_text(response.relevance_reason)
            if response.predicted_impact:
                response.predicted_impact = translator.translate_text(response.predicted_impact)
            if response.supply_chain_impact and response.supply_chain_impact != "N/A":
                response.supply_chain_impact = translator.translate_text(response.supply_chain_impact)
            if response.competitor_impact and response.competitor_impact != "N/A":
                response.competitor_impact = translator.translate_text(response.competitor_impact)
        except Exception as e:
            print(f"Translation error: {e}")
            # Return untranslated if translation fails

    return response


@router.get("/news/digest/latest", response_model=schemas.DailyDigestResponse)
async def get_latest_digest(db: Session = Depends(get_db)):
    """Get the latest daily digest."""
    from models import DailyDigest

    digest = db.query(DailyDigest).order_by(
        DailyDigest.digest_date.desc()
    ).first()

    if not digest:
        raise HTTPException(status_code=404, detail="No digest available")
    return schemas.DailyDigestResponse.model_validate(digest)


@router.post("/news/batch/run", response_model=schemas.NewsBatchRunResponse)
async def run_news_batch(
    request: schemas.NewsBatchRunRequest = None,
    db: Session = Depends(get_db)
):
    """
    Manually trigger a news batch processing run.
    This is typically run automatically by a scheduler.

    - **hours_back**: Number of hours to look back for news (default: 24)
    """
    import asyncio

    try:
        # Import here to avoid circular dependency
        import sys
        sys.path.insert(0, '/Users/kawashimaichirou/Desktop/バイブコーディング/Pure Price Press/backend')
        from services.news.batch import NewsBatchProcessor

        hours_back = request.hours_back if request else 24

        # Run batch processing
        processor = NewsBatchProcessor(db)
        results = await processor.run_daily_batch(hours_back=hours_back)

        return schemas.NewsBatchRunResponse(
            batch_id=results.get("batch_id", ""),
            status=results.get("status", "unknown"),
            message=f"Batch processing {results.get('status', 'completed')}",
            processing_time_seconds=results.get("processing_time_seconds"),
            total_collected=results.get("steps", {}).get("collection", {}).get("total_collected"),
            total_curated=results.get("steps", {}).get("analysis", {}).get("total_curated"),
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to run batch: {str(e)}")


@router.get("/news/digest/history", response_model=List[schemas.DailyDigestResponse])
async def get_digest_history(
    limit: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db)
):
    """Get history of daily digests."""
    from models import DailyDigest

    digests = db.query(DailyDigest).order_by(
        DailyDigest.digest_date.desc()
    ).limit(limit).all()

    return [schemas.DailyDigestResponse.model_validate(d) for d in digests]


# Health Check
@router.get("/health", response_model=schemas.MessageResponse)
async def health_check():
    """Health check endpoint."""
    return schemas.MessageResponse(message="Pure Price Press API is running")


# ==============================================================================
# External System Status Routes
# ==============================================================================

@router.get("/system/status")
async def get_system_status(db: Session = Depends(get_db)):
    """
    Get status of all external systems and API connections.
    Used by the settings page to show connection status.
    """
    import os
    import httpx

    status = {
        "systems": [],
        "overall_status": "healthy"
    }

    # Check Gemini API
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    gemini_status = {
        "name": "Gemini API",
        "description": "ニュース分析・翻訳に使用",
        "configured": bool(gemini_key),
        "status": "unknown",
        "api_key_preview": f"{gemini_key[:8]}...{gemini_key[-4:]}" if len(gemini_key) > 12 else "未設定",
        "env_var": "GEMINI_API_KEY"
    }

    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            # Try a simple request to verify the key works
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents="Hello"
            )
            gemini_status["status"] = "connected"
        except Exception as e:
            gemini_status["status"] = "error"
            gemini_status["error"] = str(e)[:100]
    else:
        gemini_status["status"] = "not_configured"

    status["systems"].append(gemini_status)

    # Check Alpha Vantage API
    alpha_key_config = crud.get_config(db, "alpha_vantage_api_key")
    alpha_key = alpha_key_config.value if alpha_key_config else os.getenv("ALPHA_VANTAGE_API_KEY", "")
    alpha_status = {
        "name": "Alpha Vantage",
        "description": "株価データ・ニュース取得に使用",
        "configured": bool(alpha_key),
        "status": "unknown",
        "api_key_preview": f"{alpha_key[:4]}...{alpha_key[-4:]}" if len(alpha_key) > 8 else "未設定",
        "env_var": "ALPHA_VANTAGE_API_KEY"
    }

    if alpha_key:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey={alpha_key}",
                    timeout=10.0
                )
                data = response.json()
                if "Error Message" in data or "Note" in data:
                    alpha_status["status"] = "rate_limited" if "Note" in data else "error"
                    alpha_status["error"] = data.get("Note", data.get("Error Message", ""))[:100]
                else:
                    alpha_status["status"] = "connected"
        except Exception as e:
            alpha_status["status"] = "error"
            alpha_status["error"] = str(e)[:100]
    else:
        alpha_status["status"] = "not_configured"

    status["systems"].append(alpha_status)

    # Check Finnhub API
    finnhub_key = os.getenv("FINNHUB_API_KEY", "")
    finnhub_status = {
        "name": "Finnhub",
        "description": "金融ニュース取得に使用",
        "configured": bool(finnhub_key),
        "status": "unknown",
        "api_key_preview": f"{finnhub_key[:4]}...{finnhub_key[-4:]}" if len(finnhub_key) > 8 else "未設定",
        "env_var": "FINNHUB_API_KEY"
    }

    if finnhub_key:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://finnhub.io/api/v1/quote?symbol=AAPL&token={finnhub_key}",
                    timeout=10.0
                )
                data = response.json()
                if data.get("error"):
                    finnhub_status["status"] = "error"
                    finnhub_status["error"] = data.get("error", "")[:100]
                else:
                    finnhub_status["status"] = "connected"
        except Exception as e:
            finnhub_status["status"] = "error"
            finnhub_status["error"] = str(e)[:100]
    else:
        finnhub_status["status"] = "not_configured"

    status["systems"].append(finnhub_status)

    # Check Yahoo Finance (no API key required)
    yfinance_status = {
        "name": "Yahoo Finance",
        "description": "株価データ取得に使用（無料）",
        "configured": True,
        "status": "unknown",
        "api_key_preview": "不要",
        "env_var": None
    }

    try:
        from monitor import get_current_price
        price_data = get_current_price("AAPL")
        if price_data and price_data.get("current_price"):
            yfinance_status["status"] = "connected"
        else:
            yfinance_status["status"] = "error"
            yfinance_status["error"] = "No data returned"
    except Exception as e:
        yfinance_status["status"] = "error"
        yfinance_status["error"] = str(e)[:100]

    status["systems"].append(yfinance_status)

    # Note: OpenAI API check removed - using Gemini instead
    # Gemini is already checked above

    # Check Discord Webhook
    discord_config = crud.get_config(db, "discord_webhook_url")
    discord_url = discord_config.value if discord_config else ""
    discord_status = {
        "name": "Discord Webhook",
        "description": "アラート通知に使用",
        "configured": bool(discord_url),
        "status": "unknown",
        "api_key_preview": f"...{discord_url[-20:]}" if len(discord_url) > 20 else "未設定",
        "env_var": None
    }

    if discord_url:
        discord_status["status"] = "configured"
    else:
        discord_status["status"] = "not_configured"

    status["systems"].append(discord_status)

    # Determine overall status
    connected_count = sum(1 for s in status["systems"] if s["status"] == "connected" or s["status"] == "configured")
    error_count = sum(1 for s in status["systems"] if s["status"] == "error")

    if error_count > 0:
        status["overall_status"] = "degraded"
    elif connected_count < 2:
        status["overall_status"] = "minimal"
    else:
        status["overall_status"] = "healthy"

    return status


@router.get("/system/api-keys")
async def get_api_keys(db: Session = Depends(get_db)):
    """
    Get API keys for display (masked for security).
    Shows only preview, not full keys.
    """
    import os

    def mask_key(key: str, show_chars: int = 4) -> str:
        """Mask API key, showing only first and last few characters."""
        if not key or len(key) <= show_chars * 2:
            return "••••••••"
        return f"{key[:show_chars]}••••••••{key[-show_chars:]}"

    keys = []

    # Gemini
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        keys.append({
            "name": "GEMINI_API_KEY",
            "display_name": "Gemini API Key",
            "masked_value": mask_key(gemini_key),
            "is_set": True,
            "source": "environment"
        })

    # Alpha Vantage
    alpha_config = crud.get_config(db, "alpha_vantage_api_key")
    alpha_key = alpha_config.value if alpha_config else os.getenv("ALPHA_VANTAGE_API_KEY", "")
    if alpha_key:
        keys.append({
            "name": "ALPHA_VANTAGE_API_KEY",
            "display_name": "Alpha Vantage API Key",
            "masked_value": mask_key(alpha_key),
            "is_set": True,
            "source": "database" if alpha_config else "environment"
        })

    # Finnhub
    finnhub_key = os.getenv("FINNHUB_API_KEY", "")
    if finnhub_key:
        keys.append({
            "name": "FINNHUB_API_KEY",
            "display_name": "Finnhub API Key",
            "masked_value": mask_key(finnhub_key),
            "is_set": True,
            "source": "environment"
        })

    # Discord Webhook
    discord_config = crud.get_config(db, "discord_webhook_url")
    if discord_config and discord_config.value:
        keys.append({
            "name": "DISCORD_WEBHOOK_URL",
            "display_name": "Discord Webhook URL",
            "masked_value": mask_key(discord_config.value, 8),
            "is_set": True,
            "source": "database"
        })

    return {"keys": keys}
