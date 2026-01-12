"""
News scoring and display duration logic.

Implements:
- Effective score calculation (base score + boosts - time decay)
- Display period determination based on score
- Continuous reporting detection and boost
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple
from dataclasses import dataclass


@dataclass
class ScoreConfig:
    """Configuration for score calculation."""

    # Multi-source boost
    SOURCE_BOOST_2 = 0.2  # 2 sources
    SOURCE_BOOST_3 = 0.4  # 3 sources
    SOURCE_BOOST_4_PLUS = 0.6  # 4+ sources

    # Continuous reporting boost (per additional day)
    REPORTING_DAY_BOOST = 0.3  # +0.3 per day
    REPORTING_DAY_MAX_BOOST = 1.0  # Maximum +1.0

    # Time decay
    DECAY_24H = 0.0  # 0-24 hours: no decay
    DECAY_48H = 0.5  # 24-48 hours: -0.5
    DECAY_72H = 1.0  # 48-72 hours: -1.0
    DECAY_72H_PLUS = 1.5  # 72+ hours: -1.5

    # Display periods (in days) based on effective score
    DISPLAY_PERIOD_HIGH = 7  # Score >= 8.0
    DISPLAY_PERIOD_MEDIUM = 3  # Score 6.0-7.9
    DISPLAY_PERIOD_LOW = 1  # Score 4.0-5.9
    DISPLAY_PERIOD_NONE = 0  # Score < 4.0

    # Score thresholds
    THRESHOLD_HIGH = 8.0
    THRESHOLD_MEDIUM = 6.0
    THRESHOLD_LOW = 4.0


def calculate_source_boost(source_count: int) -> float:
    """
    Calculate boost based on number of sources reporting the news.

    Args:
        source_count: Number of sources reporting this news

    Returns:
        Boost value to add to base score
    """
    config = ScoreConfig()
    if source_count >= 4:
        return config.SOURCE_BOOST_4_PLUS
    elif source_count == 3:
        return config.SOURCE_BOOST_3
    elif source_count == 2:
        return config.SOURCE_BOOST_2
    return 0.0


def calculate_reporting_boost(reporting_days: int) -> float:
    """
    Calculate boost based on continuous reporting days.

    Args:
        reporting_days: Number of days this news has been reported

    Returns:
        Boost value to add to base score
    """
    config = ScoreConfig()
    if reporting_days <= 1:
        return 0.0

    # Additional days beyond first day
    additional_days = reporting_days - 1
    boost = additional_days * config.REPORTING_DAY_BOOST

    return min(boost, config.REPORTING_DAY_MAX_BOOST)


def calculate_time_decay(first_seen_at: datetime, now: Optional[datetime] = None) -> float:
    """
    Calculate time decay based on age of news.

    Args:
        first_seen_at: When the news was first detected
        now: Current time (defaults to UTC now)

    Returns:
        Decay value to subtract from score
    """
    if now is None:
        now = datetime.now(timezone.utc)

    # Ensure timezone awareness
    if first_seen_at.tzinfo is None:
        first_seen_at = first_seen_at.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    age = now - first_seen_at
    hours = age.total_seconds() / 3600

    config = ScoreConfig()
    if hours <= 24:
        return config.DECAY_24H
    elif hours <= 48:
        return config.DECAY_48H
    elif hours <= 72:
        return config.DECAY_72H
    else:
        return config.DECAY_72H_PLUS


def calculate_effective_score(
    base_score: float,
    source_count: int = 1,
    reporting_days: int = 1,
    first_seen_at: Optional[datetime] = None,
    is_pinned: bool = False,
    now: Optional[datetime] = None
) -> float:
    """
    Calculate effective score with all boosts and decay applied.

    Formula: effective_score = base_score + source_boost + reporting_boost - time_decay

    Args:
        base_score: Original importance score (1-10)
        source_count: Number of sources reporting
        reporting_days: Days of continuous reporting
        first_seen_at: When first detected (for time decay)
        is_pinned: Whether user pinned this news
        now: Current time

    Returns:
        Effective score (can exceed 10 with boosts)
    """
    # Pinned news doesn't decay but still gets boosts
    source_boost = calculate_source_boost(source_count)
    reporting_boost = calculate_reporting_boost(reporting_days)

    if is_pinned:
        # Pinned: no time decay
        return base_score + source_boost + reporting_boost

    if first_seen_at:
        time_decay = calculate_time_decay(first_seen_at, now)
    else:
        time_decay = 0.0

    effective = base_score + source_boost + reporting_boost - time_decay

    # Minimum score is 0
    return max(0.0, effective)


def get_display_period_days(effective_score: float, is_pinned: bool = False) -> int:
    """
    Determine display period based on effective score.

    Args:
        effective_score: Calculated effective score
        is_pinned: Whether user pinned this news

    Returns:
        Number of days to display (0 means don't display, -1 means unlimited)
    """
    if is_pinned:
        return -1  # Unlimited

    config = ScoreConfig()
    if effective_score >= config.THRESHOLD_HIGH:
        return config.DISPLAY_PERIOD_HIGH
    elif effective_score >= config.THRESHOLD_MEDIUM:
        return config.DISPLAY_PERIOD_MEDIUM
    elif effective_score >= config.THRESHOLD_LOW:
        return config.DISPLAY_PERIOD_LOW
    else:
        return config.DISPLAY_PERIOD_NONE


def should_display(
    first_seen_at: datetime,
    effective_score: float,
    is_pinned: bool = False,
    now: Optional[datetime] = None
) -> bool:
    """
    Determine if a news item should be displayed.

    Args:
        first_seen_at: When the news was first detected
        effective_score: Calculated effective score
        is_pinned: Whether user pinned this news
        now: Current time

    Returns:
        True if news should be displayed
    """
    if is_pinned:
        return True

    display_days = get_display_period_days(effective_score, is_pinned)
    if display_days <= 0:
        return display_days == -1  # -1 means unlimited (pinned)

    if now is None:
        now = datetime.now(timezone.utc)

    # Ensure timezone awareness
    if first_seen_at.tzinfo is None:
        first_seen_at = first_seen_at.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    age = now - first_seen_at
    return age.days < display_days


def get_remaining_display_time(
    first_seen_at: datetime,
    effective_score: float,
    is_pinned: bool = False,
    now: Optional[datetime] = None
) -> Optional[timedelta]:
    """
    Get remaining display time for a news item.

    Args:
        first_seen_at: When the news was first detected
        effective_score: Calculated effective score
        is_pinned: Whether user pinned this news
        now: Current time

    Returns:
        Remaining time as timedelta, None if unlimited or expired
    """
    if is_pinned:
        return None  # Unlimited

    display_days = get_display_period_days(effective_score, is_pinned)
    if display_days <= 0:
        return timedelta(0) if display_days == 0 else None

    if now is None:
        now = datetime.now(timezone.utc)

    # Ensure timezone awareness
    if first_seen_at.tzinfo is None:
        first_seen_at = first_seen_at.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    expiry = first_seen_at + timedelta(days=display_days)
    remaining = expiry - now

    if remaining.total_seconds() < 0:
        return timedelta(0)

    return remaining


def format_remaining_time(remaining: Optional[timedelta]) -> str:
    """
    Format remaining time for display.

    Args:
        remaining: Remaining time as timedelta

    Returns:
        Human-readable string (e.g., "あと2日", "あと12時間")
    """
    if remaining is None:
        return "無制限"

    total_seconds = remaining.total_seconds()
    if total_seconds <= 0:
        return "期限切れ"

    days = remaining.days
    hours = remaining.seconds // 3600

    if days > 0:
        return f"あと{days}日"
    elif hours > 0:
        return f"あと{hours}時間"
    else:
        minutes = remaining.seconds // 60
        return f"あと{minutes}分"


def get_score_label(effective_score: float) -> Tuple[str, str]:
    """
    Get label and color class for a score.

    Args:
        effective_score: Calculated effective score

    Returns:
        Tuple of (label, color_class)
    """
    config = ScoreConfig()
    if effective_score >= config.THRESHOLD_HIGH:
        return ("必見", "red")
    elif effective_score >= config.THRESHOLD_MEDIUM:
        return ("重要", "yellow")
    elif effective_score >= config.THRESHOLD_LOW:
        return ("参考", "blue")
    else:
        return ("低", "gray")
