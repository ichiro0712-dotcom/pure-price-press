"""
News deduplication module.
Uses simple text similarity detection to merge duplicate articles.
Optimized for serverless deployment (no heavy dependencies like numpy/sklearn).
"""
import uuid
import re
from typing import List, Dict, Optional
from dataclasses import dataclass, field

from .collector import RawNewsItem
from .config import SOURCE_PRIORITY, SIMILARITY_THRESHOLD, calculate_importance_boost


@dataclass
class MergedNewsItem:
    """Merged news item with deduplication info."""
    id: str
    title: str
    url: str
    source: str
    region: str
    category: Optional[str]
    published_at: any  # datetime
    summary: Optional[str]
    related_sources: List[str] = field(default_factory=list)
    source_count: int = 1
    importance_boost: float = 1.0
    embedding_vector: Optional[List[float]] = None
    batch_id: str = ""


class NewsDeduplicator:
    """
    Deduplicates news articles using text similarity.

    Uses a lightweight text matching approach suitable for serverless deployment.
    """

    def __init__(self, similarity_threshold: float = SIMILARITY_THRESHOLD):
        self.similarity_threshold = similarity_threshold

    def deduplicate(self, news_items: List[RawNewsItem]) -> List[MergedNewsItem]:
        """
        Deduplicate news items and merge similar articles.

        Args:
            news_items: List of raw news items

        Returns:
            List of merged news items with deduplication info
        """
        if not news_items:
            return []

        return self._deduplicate_simple(news_items)

    def _deduplicate_simple(self, news_items: List[RawNewsItem]) -> List[MergedNewsItem]:
        """Simple deduplication using exact title matching and word overlap."""
        seen_titles: Dict[str, MergedNewsItem] = {}
        merged_items: List[MergedNewsItem] = []

        for item in news_items:
            # Normalize title for comparison
            normalized_title = self._normalize_text(item.title)

            # Check for exact or near match
            matched = False
            for existing_title, existing_merged in seen_titles.items():
                if self._simple_similarity(normalized_title, existing_title) >= self.similarity_threshold:
                    # Add to existing cluster
                    if item.source not in existing_merged.related_sources:
                        existing_merged.related_sources.append(item.source)
                    existing_merged.source_count += 1
                    existing_merged.importance_boost = calculate_importance_boost(
                        existing_merged.source_count
                    )
                    matched = True
                    break

            if not matched:
                # Create new merged item
                merged = MergedNewsItem(
                    id=str(uuid.uuid4()),
                    title=item.title,
                    url=item.url,
                    source=item.source,
                    region=item.region,
                    category=item.category,
                    published_at=item.published_at,
                    summary=item.summary,
                    related_sources=[],
                    source_count=1,
                    importance_boost=1.0,
                    batch_id=item.batch_id,
                )
                seen_titles[normalized_title] = merged
                merged_items.append(merged)

        print(f"Deduplicated {len(news_items)} → {len(merged_items)} articles")
        return merged_items

    def _merge_cluster(self, items: List[RawNewsItem]) -> MergedNewsItem:
        """Merge a cluster of similar articles into one."""
        if len(items) == 1:
            item = items[0]
            return MergedNewsItem(
                id=str(uuid.uuid4()),
                title=item.title,
                url=item.url,
                source=item.source,
                region=item.region,
                category=item.category,
                published_at=item.published_at,
                summary=item.summary,
                related_sources=[],
                source_count=1,
                importance_boost=1.0,
                batch_id=item.batch_id,
            )

        # Sort by source priority to pick representative
        sorted_items = sorted(
            items,
            key=lambda x: SOURCE_PRIORITY.get(x.source, 0),
            reverse=True,
        )

        representative = sorted_items[0]
        other_sources = [item.source for item in sorted_items[1:] if item.source != representative.source]

        return MergedNewsItem(
            id=str(uuid.uuid4()),
            title=representative.title,
            url=representative.url,
            source=representative.source,
            region=representative.region,
            category=representative.category,
            published_at=representative.published_at,
            summary=representative.summary,
            related_sources=other_sources,
            source_count=len(items),
            importance_boost=calculate_importance_boost(len(items)),
            batch_id=representative.batch_id,
        )

    def _normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        # Convert to lowercase
        text = text.lower()
        # Remove punctuation
        text = re.sub(r"[^\w\s]", "", text)
        # Remove extra whitespace
        text = " ".join(text.split())
        return text

    def _simple_similarity(self, text1: str, text2: str) -> float:
        """Calculate simple word overlap similarity using Jaccard index."""
        words1 = set(text1.split())
        words2 = set(text2.split())

        if not words1 or not words2:
            return 0.0

        intersection = words1 & words2
        union = words1 | words2

        # Jaccard similarity
        return len(intersection) / len(union) if union else 0.0

    def get_dedup_stats(self, original: int, merged: int) -> Dict:
        """Get deduplication statistics."""
        return {
            "original_count": original,
            "merged_count": merged,
            "duplicates_removed": original - merged,
            "dedup_ratio": (original - merged) / original if original > 0 else 0,
        }
