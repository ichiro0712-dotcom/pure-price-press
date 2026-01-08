"""
CRUD operations for Pure Price Press.
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timedelta
from typing import List, Optional
import models
import schemas


# MonitorTarget CRUD
def get_monitor_target(db: Session, target_id: int) -> Optional[models.MonitorTarget]:
    """Get a monitor target by ID."""
    try:
        return db.query(models.MonitorTarget).filter(models.MonitorTarget.id == target_id).first()
    except Exception as e:
        print(f"Error getting monitor target: {e}")
        return None


def get_monitor_target_by_symbol(db: Session, symbol: str) -> Optional[models.MonitorTarget]:
    """Get a monitor target by symbol."""
    try:
        return db.query(models.MonitorTarget).filter(models.MonitorTarget.symbol == symbol.upper()).first()
    except Exception as e:
        print(f"Error getting monitor target by symbol: {e}")
        return None


def get_monitor_targets(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False
) -> List[models.MonitorTarget]:
    """Get all monitor targets sorted by display_order."""
    try:
        query = db.query(models.MonitorTarget)
        if active_only:
            query = query.filter(models.MonitorTarget.is_active == True)
        return query.order_by(models.MonitorTarget.display_order, models.MonitorTarget.id).offset(skip).limit(limit).all()
    except Exception as e:
        print(f"Error getting monitor targets: {e}")
        return []


def create_monitor_target(
    db: Session,
    target: schemas.MonitorTargetCreate
) -> models.MonitorTarget:
    """Create a new monitor target."""
    try:
        target_data = target.model_dump()
        # Convert conditions list to JSON if present
        if 'conditions' in target_data and target_data['conditions']:
            target_data['conditions_json'] = [
                c.model_dump() if hasattr(c, 'model_dump') else (c.dict() if hasattr(c, 'dict') else c)
                for c in target_data['conditions']
            ]
            del target_data['conditions']
        elif 'conditions' in target_data:
            # conditionsがNoneまたは空の場合もconditions_jsonをNoneにする
            target_data['conditions_json'] = None
            del target_data['conditions']

        db_target = models.MonitorTarget(**target_data)
        db.add(db_target)
        db.commit()
        db.refresh(db_target)
        return db_target
    except Exception as e:
        db.rollback()
        print(f"Error creating monitor target: {e}")
        raise e


def update_monitor_target(
    db: Session,
    target_id: int,
    target_update: schemas.MonitorTargetUpdate
) -> Optional[models.MonitorTarget]:
    """Update an existing monitor target."""
    try:
        db_target = get_monitor_target(db, target_id)
        if not db_target:
            return None

        update_data = target_update.model_dump(exclude_unset=True)

        # Convert conditions list to JSON if present
        if 'conditions' in update_data:
            if update_data['conditions'] is not None:
                update_data['conditions_json'] = [
                    c.model_dump() if hasattr(c, 'model_dump') else (c.dict() if hasattr(c, 'dict') else c)
                    for c in update_data['conditions']
                ]
            else:
                # conditionsがNoneの場合はconditions_jsonもNoneにする
                update_data['conditions_json'] = None
            del update_data['conditions']

        for field, value in update_data.items():
            setattr(db_target, field, value)

        db.commit()
        db.refresh(db_target)
        return db_target
    except Exception as e:
        db.rollback()
        print(f"Error updating monitor target: {e}")
        raise e


def delete_monitor_target(db: Session, target_id: int) -> bool:
    """Delete a monitor target."""
    try:
        db_target = get_monitor_target(db, target_id)
        if not db_target:
            return False

        db.delete(db_target)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error deleting monitor target: {e}")
        raise e


def update_last_price(
    db: Session,
    symbol: str,
    price: float
) -> Optional[models.MonitorTarget]:
    """Update the last price and check time for a symbol."""
    try:
        db_target = get_monitor_target_by_symbol(db, symbol)
        if not db_target:
            return None

        db_target.last_price = price
        db_target.last_check_at = datetime.utcnow()
        db.commit()
        db.refresh(db_target)
        return db_target
    except Exception as e:
        db.rollback()
        print(f"Error updating last price: {e}")
        raise e


# AlertHistory CRUD
def get_alert(db: Session, alert_id: int) -> Optional[models.AlertHistory]:
    """Get an alert by ID."""
    try:
        return db.query(models.AlertHistory).filter(models.AlertHistory.id == alert_id).first()
    except Exception as e:
        print(f"Error getting alert: {e}")
        return None


def get_alerts(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    symbol: Optional[str] = None,
    days: Optional[int] = None
) -> List[models.AlertHistory]:
    """Get alert history with optional filters."""
    try:
        query = db.query(models.AlertHistory)

        if symbol:
            query = query.filter(models.AlertHistory.symbol == symbol.upper())

        if days:
            since = datetime.utcnow() - timedelta(days=days)
            query = query.filter(models.AlertHistory.triggered_at >= since)

        return query.order_by(desc(models.AlertHistory.triggered_at)).offset(skip).limit(limit).all()
    except Exception as e:
        print(f"Error getting alerts: {e}")
        return []


def create_alert(
    db: Session,
    alert: schemas.AlertHistoryCreate
) -> models.AlertHistory:
    """Create a new alert."""
    try:
        db_alert = models.AlertHistory(**alert.model_dump())
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        return db_alert
    except Exception as e:
        db.rollback()
        print(f"Error creating alert: {e}")
        raise e


def mark_alert_notified(
    db: Session,
    alert_id: int,
    error: Optional[str] = None
) -> Optional[models.AlertHistory]:
    """Mark an alert as notified."""
    try:
        db_alert = get_alert(db, alert_id)
        if not db_alert:
            return None

        db_alert.notified = True
        if error:
            db_alert.notification_error = error

        db.commit()
        db.refresh(db_alert)
        return db_alert
    except Exception as e:
        db.rollback()
        print(f"Error marking alert as notified: {e}")
        raise e


def get_alerts_count(db: Session, days: Optional[int] = None) -> int:
    """Get total count of alerts."""
    try:
        query = db.query(func.count(models.AlertHistory.id))

        if days:
            since = datetime.utcnow() - timedelta(days=days)
            query = query.filter(models.AlertHistory.triggered_at >= since)

        return query.scalar() or 0
    except Exception as e:
        print(f"Error getting alerts count: {e}")
        return 0


def get_critical_alerts_count(db: Session, days: int = 1) -> int:
    """Get count of critical alerts (>= 10% change)."""
    try:
        since = datetime.utcnow() - timedelta(days=days)
        return db.query(func.count(models.AlertHistory.id)).filter(
            models.AlertHistory.triggered_at >= since,
            func.abs(models.AlertHistory.change_rate) >= 10
        ).scalar() or 0
    except Exception as e:
        print(f"Error getting critical alerts count: {e}")
        return 0


def delete_alert(db: Session, alert_id: int) -> bool:
    """Delete an alert."""
    try:
        db_alert = get_alert(db, alert_id)
        if not db_alert:
            return False

        db.delete(db_alert)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error deleting alert: {e}")
        raise e


# SystemConfig CRUD
def get_config(db: Session, key: str) -> Optional[models.SystemConfig]:
    """Get a system config by key."""
    try:
        return db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    except Exception as e:
        print(f"Error getting config: {e}")
        return None


def get_all_configs(db: Session) -> List[models.SystemConfig]:
    """Get all system configs."""
    try:
        return db.query(models.SystemConfig).all()
    except Exception as e:
        print(f"Error getting all configs: {e}")
        return []


def set_config(
    db: Session,
    key: str,
    value: str,
    description: Optional[str] = None
) -> models.SystemConfig:
    """Set or update a system config."""
    try:
        db_config = get_config(db, key)

        if db_config:
            db_config.value = value
            if description:
                db_config.description = description
        else:
            db_config = models.SystemConfig(key=key, value=value, description=description)
            db.add(db_config)

        db.commit()
        db.refresh(db_config)
        return db_config
    except Exception as e:
        db.rollback()
        print(f"Error setting config: {e}")
        raise e


def delete_config(db: Session, key: str) -> bool:
    """Delete a system config."""
    try:
        db_config = get_config(db, key)
        if not db_config:
            return False

        db.delete(db_config)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error deleting config: {e}")
        raise e


def reorder_monitor_targets(
    db: Session,
    target_ids: List[int]
) -> bool:
    """Reorder monitor targets by updating their display_order."""
    try:
        for order, target_id in enumerate(target_ids):
            db_target = get_monitor_target(db, target_id)
            if db_target:
                db_target.display_order = order
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error reordering monitor targets: {e}")
        raise e


def get_categories(db: Session) -> List[str]:
    """Get all unique categories from monitor targets."""
    try:
        result = db.query(models.MonitorTarget.category).filter(
            models.MonitorTarget.category.isnot(None),
            models.MonitorTarget.category != ''
        ).distinct().all()
        return [r[0] for r in result if r[0]]
    except Exception as e:
        print(f"Error getting categories: {e}")
        return []


def get_monitor_targets_by_category(
    db: Session,
    category: str,
    active_only: bool = False
) -> List[models.MonitorTarget]:
    """Get all monitor targets in a specific category."""
    try:
        query = db.query(models.MonitorTarget).filter(models.MonitorTarget.category == category)
        if active_only:
            query = query.filter(models.MonitorTarget.is_active == True)
        return query.order_by(models.MonitorTarget.display_order, models.MonitorTarget.id).all()
    except Exception as e:
        print(f"Error getting monitor targets by category: {e}")
        return []


# PushSubscription CRUD
def get_push_subscription_by_endpoint(db: Session, endpoint: str) -> Optional[models.PushSubscription]:
    """Get a push subscription by endpoint."""
    try:
        return db.query(models.PushSubscription).filter(models.PushSubscription.endpoint == endpoint).first()
    except Exception as e:
        print(f"Error getting push subscription: {e}")
        return None


def get_all_push_subscriptions(db: Session) -> List[models.PushSubscription]:
    """Get all push subscriptions."""
    try:
        return db.query(models.PushSubscription).all()
    except Exception as e:
        print(f"Error getting all push subscriptions: {e}")
        return []


def create_push_subscription(
    db: Session,
    endpoint: str,
    p256dh: str,
    auth: str
) -> models.PushSubscription:
    """Create a new push subscription or update existing one."""
    try:
        existing = get_push_subscription_by_endpoint(db, endpoint)
        if existing:
            existing.p256dh = p256dh
            existing.auth = auth
            db.commit()
            db.refresh(existing)
            return existing

        db_subscription = models.PushSubscription(
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth
        )
        db.add(db_subscription)
        db.commit()
        db.refresh(db_subscription)
        return db_subscription
    except Exception as e:
        db.rollback()
        print(f"Error creating push subscription: {e}")
        raise e


def delete_push_subscription(db: Session, endpoint: str) -> bool:
    """Delete a push subscription by endpoint."""
    try:
        subscription = get_push_subscription_by_endpoint(db, endpoint)
        if not subscription:
            return False

        db.delete(subscription)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error deleting push subscription: {e}")
        raise e


def update_push_subscription_last_used(db: Session, endpoint: str) -> Optional[models.PushSubscription]:
    """Update the last_used_at timestamp for a push subscription."""
    try:
        subscription = get_push_subscription_by_endpoint(db, endpoint)
        if not subscription:
            return None

        subscription.last_used_at = datetime.utcnow()
        db.commit()
        db.refresh(subscription)
        return subscription
    except Exception as e:
        db.rollback()
        print(f"Error updating push subscription last used: {e}")
        raise e


# Alert check-new helper
def get_alerts_since(
    db: Session,
    since: datetime,
    limit: int = 100
) -> List[models.AlertHistory]:
    """Get alerts triggered since a specific timestamp."""
    try:
        return db.query(models.AlertHistory).filter(
            models.AlertHistory.triggered_at > since
        ).order_by(desc(models.AlertHistory.triggered_at)).limit(limit).all()
    except Exception as e:
        print(f"Error getting alerts since: {e}")
        return []
