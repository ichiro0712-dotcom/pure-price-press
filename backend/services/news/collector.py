"""
News collector module.
Collects news from multiple sources (APIs and RSS feeds).
"""
import os
import uuid
import asyncio
import httpx
import feedparser
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Any
from dataclasses import dataclass

from .config import NEWS_SOURCES, NewsSourceConfig, REGIONAL_BALANCE


@dataclass
class RawNewsItem:
    """Raw news item data structure."""
    id: str
    title: str
    url: str
    source: str
    region: str
    category: Optional[str]
    published_at: datetime
    summary: Optional[str]
    batch_id: str


class NewsCollector:
    """
    Collects news from multiple sources with regional balance.

    Supports:
    - Alpha Vantage News API
    - Finnhub News API
    - RSS feeds (Google News, Nikkei Asia, etc.)
    """

    def __init__(self):
        self.alpha_vantage_key = os.getenv("ALPHA_VANTAGE_API_KEY")
        self.finnhub_key = os.getenv("FINNHUB_API_KEY")
        self.batch_id = str(uuid.uuid4())

    async def collect_all(self, hours_back: int = 24) -> List[RawNewsItem]:
        """
        Collect news from all configured sources.

        Args:
            hours_back: Number of hours to look back for news

        Returns:
            List of raw news items
        """
        all_news: List[RawNewsItem] = []
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours_back)

        # Collect from each source concurrently
        tasks = []
        for source_config in NEWS_SOURCES:
            if source_config.source_type == "api":
                if source_config.api_provider == "alpha_vantage" and self.alpha_vantage_key:
                    tasks.append(self._collect_alpha_vantage(source_config, cutoff_time))
                elif source_config.api_provider == "finnhub" and self.finnhub_key:
                    tasks.append(self._collect_finnhub(source_config, cutoff_time))
            elif source_config.source_type == "rss":
                tasks.append(self._collect_rss(source_config, cutoff_time))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                print(f"Error collecting news: {result}")
                continue
            if result:
                all_news.extend(result)

        # Remove duplicates by URL
        seen_urls = set()
        unique_news = []
        for item in all_news:
            if item.url not in seen_urls:
                seen_urls.add(item.url)
                unique_news.append(item)

        print(f"Collected {len(unique_news)} unique articles from {len(tasks)} sources")
        return unique_news

    async def _collect_alpha_vantage(
        self, config: NewsSourceConfig, cutoff_time: datetime
    ) -> List[RawNewsItem]:
        """Collect news from Alpha Vantage News API."""
        if not self.alpha_vantage_key:
            return []

        news_items = []
        params = config.params or {}
        topics = params.get("topics", "")

        async with httpx.AsyncClient() as client:
            try:
                # Alpha Vantage News Sentiment API
                url = "https://www.alphavantage.co/query"
                response = await client.get(
                    url,
                    params={
                        "function": "NEWS_SENTIMENT",
                        "topics": topics,
                        "sort": "LATEST",
                        "limit": 50,
                        "apikey": self.alpha_vantage_key,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                for item in data.get("feed", []):
                    try:
                        # Parse time_published (format: 20231215T120000)
                        pub_time_str = item.get("time_published", "")
                        if pub_time_str:
                            pub_time = datetime.strptime(
                                pub_time_str, "%Y%m%dT%H%M%S"
                            ).replace(tzinfo=timezone.utc)
                        else:
                            pub_time = datetime.now(timezone.utc)

                        if pub_time < cutoff_time:
                            continue

                        # Determine region from source
                        source_name = item.get("source", "Unknown")
                        region = self._infer_region(source_name)

                        news_items.append(
                            RawNewsItem(
                                id=str(uuid.uuid4()),
                                title=item.get("title", ""),
                                url=item.get("url", ""),
                                source=source_name,
                                region=region,
                                category=self._infer_category(item.get("topics", [])),
                                published_at=pub_time,
                                summary=item.get("summary", ""),
                                batch_id=self.batch_id,
                            )
                        )
                    except Exception as e:
                        print(f"Error parsing Alpha Vantage item: {e}")
                        continue

                print(f"Alpha Vantage: collected {len(news_items)} articles")
            except Exception as e:
                print(f"Error fetching from Alpha Vantage: {e}")

        return news_items

    async def _collect_finnhub(
        self, config: NewsSourceConfig, cutoff_time: datetime
    ) -> List[RawNewsItem]:
        """Collect news from Finnhub News API."""
        if not self.finnhub_key:
            return []

        news_items = []
        params = config.params or {}
        category = params.get("category", "general")

        async with httpx.AsyncClient() as client:
            try:
                url = "https://finnhub.io/api/v1/news"
                response = await client.get(
                    url,
                    params={"category": category, "token": self.finnhub_key},
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                for item in data:
                    try:
                        # Parse datetime (Unix timestamp)
                        pub_time = datetime.fromtimestamp(
                            item.get("datetime", 0), tz=timezone.utc
                        )

                        if pub_time < cutoff_time:
                            continue

                        source_name = item.get("source", "Unknown")
                        region = self._infer_region(source_name)

                        news_items.append(
                            RawNewsItem(
                                id=str(uuid.uuid4()),
                                title=item.get("headline", ""),
                                url=item.get("url", ""),
                                source=source_name,
                                region=region,
                                category=item.get("category", None),
                                published_at=pub_time,
                                summary=item.get("summary", ""),
                                batch_id=self.batch_id,
                            )
                        )
                    except Exception as e:
                        print(f"Error parsing Finnhub item: {e}")
                        continue

                print(f"Finnhub: collected {len(news_items)} articles")
            except Exception as e:
                print(f"Error fetching from Finnhub: {e}")

        return news_items

    async def _collect_rss(
        self, config: NewsSourceConfig, cutoff_time: datetime
    ) -> List[RawNewsItem]:
        """Collect news from RSS feed."""
        if not config.rss_url:
            return []

        news_items = []

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(config.rss_url, timeout=30.0)
                response.raise_for_status()

                # Parse RSS feed
                feed = feedparser.parse(response.text)

                for entry in feed.entries:
                    try:
                        # Parse published time
                        if hasattr(entry, "published_parsed") and entry.published_parsed:
                            pub_time = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                        elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                            pub_time = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
                        else:
                            pub_time = datetime.now(timezone.utc)

                        if pub_time < cutoff_time:
                            continue

                        # Get summary if available
                        summary = None
                        if hasattr(entry, "summary"):
                            summary = entry.summary
                        elif hasattr(entry, "description"):
                            summary = entry.description

                        news_items.append(
                            RawNewsItem(
                                id=str(uuid.uuid4()),
                                title=entry.get("title", ""),
                                url=entry.get("link", ""),
                                source=config.name,
                                region=config.region,
                                category=None,
                                published_at=pub_time,
                                summary=summary,
                                batch_id=self.batch_id,
                            )
                        )
                    except Exception as e:
                        print(f"Error parsing RSS entry from {config.name}: {e}")
                        continue

                print(f"{config.name}: collected {len(news_items)} articles")
            except Exception as e:
                print(f"Error fetching RSS from {config.name}: {e}")

        return news_items

    def _infer_region(self, source_name: str) -> str:
        """Infer region from source name."""
        source_lower = source_name.lower()

        # North America sources
        na_keywords = [
            "reuters", "bloomberg", "cnbc", "marketwatch", "wsj",
            "wall street", "yahoo", "fox business", "barron"
        ]
        if any(kw in source_lower for kw in na_keywords):
            return "north_america"

        # Europe sources
        eu_keywords = ["ft", "financial times", "guardian", "bbc", "telegraph", "spiegel"]
        if any(kw in source_lower for kw in eu_keywords):
            return "europe"

        # Asia sources
        asia_keywords = ["nikkei", "scmp", "china", "asia", "xinhua", "caixin", "straits"]
        if any(kw in source_lower for kw in asia_keywords):
            return "asia"

        # Middle East sources
        me_keywords = ["al jazeera", "arab", "gulf", "middle east"]
        if any(kw in source_lower for kw in me_keywords):
            return "middle_east"

        # Default to north_america (most financial news)
        return "north_america"

    def _infer_category(self, topics: List[Any]) -> Optional[str]:
        """Infer category from Alpha Vantage topics."""
        if not topics:
            return None

        topic_mapping = {
            "earnings": "earnings",
            "ipo": "mergers_acquisitions",
            "mergers_and_acquisitions": "mergers_acquisitions",
            "financial_markets": "macro_data",
            "economy_fiscal": "fiscal_policy",
            "economy_monetary": "monetary_policy",
            "economy_macro": "macro_data",
            "energy_transportation": "commodities",
            "technology": "technology",
            "blockchain": "technology",
            "retail_wholesale": "earnings",
            "manufacturing": "earnings",
        }

        for topic in topics:
            topic_str = topic.get("topic", "") if isinstance(topic, dict) else str(topic)
            topic_lower = topic_str.lower()
            for key, category in topic_mapping.items():
                if key in topic_lower:
                    return category

        return None

    def get_regional_stats(self, news_items: List[RawNewsItem]) -> Dict[str, int]:
        """Get article count by region."""
        stats = {}
        for item in news_items:
            stats[item.region] = stats.get(item.region, 0) + 1
        return stats

    def check_regional_balance(self, news_items: List[RawNewsItem]) -> Dict[str, Any]:
        """
        Check if collected news meets regional balance targets.

        Returns:
            Dict with balance info and any deficiencies
        """
        stats = self.get_regional_stats(news_items)
        total = len(news_items)

        result = {
            "total_articles": total,
            "regional_stats": stats,
            "target_balance": REGIONAL_BALANCE,
            "actual_balance": {},
            "deficiencies": [],
        }

        for region, target_pct in REGIONAL_BALANCE.items():
            actual = stats.get(region, 0)
            actual_pct = actual / total if total > 0 else 0
            result["actual_balance"][region] = actual_pct

            # Check if significantly under target (more than 10% below)
            if actual_pct < target_pct * 0.5:  # Less than half the target
                result["deficiencies"].append({
                    "region": region,
                    "target": target_pct,
                    "actual": actual_pct,
                    "shortfall": target_pct - actual_pct,
                })

        return result
