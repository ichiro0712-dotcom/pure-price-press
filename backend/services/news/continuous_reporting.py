"""
Continuous reporting detection module.

Detects when the same topic is reported across multiple days
and updates reporting_days and last_seen_at accordingly.
"""

import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from .deduplicator import NewsDeduplicator
from .scoring import calculate_effective_score


# Thresholds for same topic detection
TITLE_SIMILARITY_THRESHOLD = 0.85
SYMBOL_OVERLAP_THRESHOLD = 0.5
LOOKBACK_DAYS = 7


def normalize_text(text: str) -> str:
    """Normalize text for comparison."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    text = " ".join(text.split())
    return text


def jaccard_similarity(text1: str, text2: str) -> float:
    """Calculate Jaccard similarity between two texts."""
    words1 = set(normalize_text(text1).split())
    words2 = set(normalize_text(text2).split())

    if not words1 or not words2:
        return 0.0

    intersection = words1 & words2
    union = words1 | words2

    return len(intersection) / len(union) if union else 0.0


def symbol_overlap(symbols1: Optional[List[str]], symbols2: Optional[List[str]]) -> float:
    """Calculate overlap ratio between two symbol lists."""
    if not symbols1 or not symbols2:
        return 0.0

    set1 = set(symbols1)
    set2 = set(symbols2)

    if not set1 or not set2:
        return 0.0

    intersection = set1 & set2
    smaller = min(len(set1), len(set2))

    return len(intersection) / smaller if smaller > 0 else 0.0


def is_same_topic(
    title1: str,
    title2: str,
    symbols1: Optional[List[str]] = None,
    symbols2: Optional[List[str]] = None,
    category1: Optional[str] = None,
    category2: Optional[str] = None,
) -> bool:
    """
    Determine if two news items are about the same topic.

    Criteria:
    1. Title similarity >= 85% (Jaccard)
    2. If symbols available: >= 50% overlap
    3. If categories available: must match

    Args:
        title1, title2: News titles
        symbols1, symbols2: Affected symbols lists
        category1, category2: News categories

    Returns:
        True if same topic
    """
    # Check title similarity
    title_sim = jaccard_similarity(title1, title2)
    if title_sim < TITLE_SIMILARITY_THRESHOLD:
        return False

    # If we have symbols, check overlap
    if symbols1 and symbols2:
        sym_overlap = symbol_overlap(symbols1, symbols2)
        if sym_overlap < SYMBOL_OVERLAP_THRESHOLD:
            return False

    # If we have categories, check match
    if category1 and category2:
        if category1.lower() != category2.lower():
            return False

    return True


def detect_continuous_reporting(
    db: Session,
    new_news_id: int,
    lookback_days: int = LOOKBACK_DAYS
) -> Optional[int]:
    """
    Check if a new news item is a continuation of previous reporting.

    Args:
        db: Database session
        new_news_id: ID of the new curated news
        lookback_days: How many days to look back

    Returns:
        ID of the original news if continuous reporting detected, None otherwise
    """
    from models import CuratedNews

    # Get the new news
    new_news = db.query(CuratedNews).filter(CuratedNews.id == new_news_id).first()
    if not new_news:
        return None

    # Look for similar news in the past N days
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    existing_news = db.query(CuratedNews).filter(
        CuratedNews.id != new_news_id,
        CuratedNews.first_seen_at >= cutoff,
        CuratedNews.first_seen_at < new_news.first_seen_at if new_news.first_seen_at else True
    ).all()

    for existing in existing_news:
        if is_same_topic(
            new_news.title,
            existing.title,
            new_news.affected_symbols,
            existing.affected_symbols,
            new_news.category,
            existing.category
        ):
            return existing.id

    return None


def update_continuous_reporting(db: Session, original_id: int, new_news_id: int) -> bool:
    """
    Update the original news with continuous reporting info.

    - Increments reporting_days
    - Updates last_seen_at
    - Recalculates effective_score
    - Optionally marks the new news as a duplicate

    Args:
        db: Database session
        original_id: ID of the original news
        new_news_id: ID of the new (continuation) news

    Returns:
        True if update was successful
    """
    from models import CuratedNews

    original = db.query(CuratedNews).filter(CuratedNews.id == original_id).first()
    new_news = db.query(CuratedNews).filter(CuratedNews.id == new_news_id).first()

    if not original or not new_news:
        return False

    now = datetime.now(timezone.utc)

    # Update original news
    original.reporting_days = (original.reporting_days or 1) + 1
    original.last_seen_at = now

    # Recalculate effective score
    original.effective_score = calculate_effective_score(
        base_score=original.importance_score,
        source_count=original.source_count or 1,
        reporting_days=original.reporting_days,
        first_seen_at=original.first_seen_at,
        is_pinned=original.is_pinned or False,
        now=now
    )

    # Mark new news as continuation (lower score to avoid duplication in display)
    # Or we could delete it, but keeping for history
    new_news.effective_score = 0  # Won't be displayed

    db.commit()
    print(f"Updated continuous reporting: News #{original_id} now has {original.reporting_days} days of reporting")

    return True


def process_batch_for_continuous_reporting(db: Session, batch_news_ids: List[int]) -> dict:
    """
    Process a batch of new news items for continuous reporting detection.

    Args:
        db: Database session
        batch_news_ids: List of new curated news IDs

    Returns:
        Statistics about continuous reporting detection
    """
    stats = {
        "processed": len(batch_news_ids),
        "continuous_found": 0,
        "updated_originals": [],
    }

    for news_id in batch_news_ids:
        original_id = detect_continuous_reporting(db, news_id)
        if original_id:
            if update_continuous_reporting(db, original_id, news_id):
                stats["continuous_found"] += 1
                if original_id not in stats["updated_originals"]:
                    stats["updated_originals"].append(original_id)

    return stats


def recalculate_all_effective_scores(db: Session) -> int:
    """
    Recalculate effective scores for all curated news.

    Should be called periodically (e.g., daily) to update time decay.

    Args:
        db: Database session

    Returns:
        Number of news items updated
    """
    from models import CuratedNews

    now = datetime.now(timezone.utc)
    news_items = db.query(CuratedNews).all()
    updated = 0

    for news in news_items:
        new_score = calculate_effective_score(
            base_score=news.importance_score,
            source_count=news.source_count or 1,
            reporting_days=news.reporting_days or 1,
            first_seen_at=news.first_seen_at or news.created_at,
            is_pinned=news.is_pinned or False,
            now=now
        )

        if news.effective_score != new_score:
            news.effective_score = new_score
            updated += 1

    if updated > 0:
        db.commit()
        print(f"Recalculated effective scores for {updated} news items")

    return updated
