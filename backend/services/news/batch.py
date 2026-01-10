"""
Daily news batch processing module.
Orchestrates the full news collection and analysis pipeline.
"""
import asyncio
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from dataclasses import asdict
import uuid

from sqlalchemy.orm import Session

from .collector import NewsCollector, RawNewsItem
from .deduplicator import NewsDeduplicator, MergedNewsItem
from .analyzer import NewsAnalyzer, CuratedNewsResult
from .translator import NewsTranslator


class NewsBatchProcessor:
    """
    Orchestrates the daily news batch processing.

    Pipeline:
    1. Collect news from all sources
    2. Deduplicate and merge similar articles
    3. Run multi-stage LLM analysis
    4. Save results to database
    """

    def __init__(self, db: Session):
        self.db = db
        self.collector = NewsCollector()
        self.deduplicator = NewsDeduplicator()
        self.analyzer = NewsAnalyzer()
        self.translator = NewsTranslator()
        self.batch_id = str(uuid.uuid4())

    async def run_daily_batch(
        self,
        hours_back: int = 24,
        registered_symbols: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Run the complete daily batch processing.

        Args:
            hours_back: How many hours back to collect news
            registered_symbols: User's registered stock symbols

        Returns:
            Processing results summary
        """
        start_time = time.time()
        results = {
            "batch_id": self.batch_id,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "status": "running",
            "steps": {},
        }

        try:
            # Step 1: Collect news
            print(f"\n{'='*60}")
            print(f"Step 1: Collecting news (last {hours_back} hours)")
            print(f"{'='*60}")
            raw_news = await self.collector.collect_all(hours_back=hours_back)
            results["steps"]["collection"] = {
                "total_collected": len(raw_news),
                "regional_balance": self.collector.check_regional_balance(raw_news),
            }
            print(f"Collected {len(raw_news)} articles")

            # Save raw news to database
            await self._save_raw_news(raw_news)

            # Step 2: Deduplicate
            print(f"\n{'='*60}")
            print("Step 2: Deduplicating news")
            print(f"{'='*60}")
            merged_news = self.deduplicator.deduplicate(raw_news)
            results["steps"]["deduplication"] = self.deduplicator.get_dedup_stats(
                len(raw_news), len(merged_news)
            )
            print(f"Deduplicated to {len(merged_news)} unique articles")

            # Save merged news to database
            await self._save_merged_news(merged_news)

            # Step 3: Analyze
            print(f"\n{'='*60}")
            print("Step 3: Running LLM analysis")
            print(f"{'='*60}")
            symbols = registered_symbols or []
            if not symbols:
                # Get symbols from database if not provided
                symbols = await self._get_registered_symbols()

            curated_news = await self.analyzer.analyze_batch(merged_news, symbols)
            results["steps"]["analysis"] = self.analyzer.get_analysis_stats(curated_news)
            print(f"Curated {len(curated_news)} articles")

            # Save curated news to database
            await self._save_curated_news(curated_news)

            # Create daily digest
            await self._create_daily_digest(results)

            # Finalize
            end_time = time.time()
            results["status"] = "completed"
            results["processing_time_seconds"] = round(end_time - start_time, 2)
            results["completed_at"] = datetime.now(timezone.utc).isoformat()

            print(f"\n{'='*60}")
            print(f"Batch completed in {results['processing_time_seconds']}s")
            print(f"{'='*60}")

        except Exception as e:
            results["status"] = "failed"
            results["error"] = str(e)
            print(f"Batch failed: {e}")
            import traceback
            traceback.print_exc()

        return results

    async def _save_raw_news(self, news_items: List[RawNewsItem]) -> None:
        """Save raw news items to database."""
        from models import RawNews

        saved_count = 0
        for item in news_items:
            # Check if URL already exists
            existing = self.db.query(RawNews).filter(RawNews.url == item.url[:2000]).first()
            if existing:
                continue

            raw_news = RawNews(
                id=item.id,
                title=item.title[:500],  # Truncate to fit column
                url=item.url[:2000],
                source=item.source[:100],
                region=item.region[:50],
                category=item.category[:50] if item.category else None,
                published_at=item.published_at,
                summary=item.summary,
                batch_id=item.batch_id,
            )
            self.db.add(raw_news)
            saved_count += 1

        self.db.commit()
        print(f"Saved {saved_count} new raw news items (skipped {len(news_items) - saved_count} duplicates)")

    async def _save_merged_news(self, news_items: List[MergedNewsItem]) -> None:
        """Save merged news items to database."""
        from models import MergedNews

        saved_count = 0
        for item in news_items:
            # Check if URL already exists
            existing = self.db.query(MergedNews).filter(MergedNews.url == item.url[:2000]).first()
            if existing:
                continue

            merged_news = MergedNews(
                id=item.id,
                title=item.title[:500],
                url=item.url[:2000],
                source=item.source[:100],
                region=item.region[:50],
                category=item.category[:50] if item.category else None,
                published_at=item.published_at,
                summary=item.summary,
                related_sources=item.related_sources,
                source_count=item.source_count,
                importance_boost=item.importance_boost,
                embedding_vector=item.embedding_vector,
                batch_id=item.batch_id,
            )
            self.db.add(merged_news)
            saved_count += 1

        self.db.commit()
        print(f"Saved {saved_count} new merged news items (skipped {len(news_items) - saved_count} duplicates)")

    async def _save_curated_news(self, curated_items: List[CuratedNewsResult]) -> None:
        """Save curated news items to database."""
        from models import CuratedNews

        # Collect all texts to translate for batch processing
        titles = [item.merged_news.title for item in curated_items]
        
        # Translate titles in batch
        translated_titles = self.translator.translate_batch(titles)
        
        digest_date = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        for i, item in enumerate(curated_items):
            news = item.merged_news
            stage2 = item.stage2
            stage3 = item.stage3
            stage4 = item.stage4
            
            # Use translated title
            title_ja = translated_titles[i] if i < len(translated_titles) else news.title

            # Translate other fields if needed (analyzer should honestly do this, but best to be safe)
            relevance_reason = stage4.summary_for_user if stage4 else ""
            relevance_reason = self.translator.translate_text(relevance_reason)
            
            predicted_impact = stage2.predicted_impact if stage2 else None
            predicted_impact = self.translator.translate_text(predicted_impact)
            
            supply_chain_impact = stage2.supply_chain_analysis if stage2 else None
            supply_chain_impact = self.translator.translate_text(supply_chain_impact)
            
            competitor_impact = stage2.competitor_analysis if stage2 else None
            competitor_impact = self.translator.translate_text(competitor_impact)
            
            # Translate category if it looks like an English key
            category = news.category
            if category and not self.translator._is_japanese(category):
                 # Simple mapping or translate
                 category = self.translator.translate_text(category)

            # Translate ai_summary if needed
            ai_summary = stage2.ai_summary if stage2 else None
            if ai_summary:
                ai_summary = self.translator.translate_text(ai_summary)

            curated = CuratedNews(
                merged_news_id=news.id,
                digest_date=digest_date,
                title=title_ja[:500],
                url=news.url[:2000],
                source=news.source[:100],
                region=news.region[:50],
                category=category[:50] if category else None,
                published_at=news.published_at,  # Original publication time from merged news
                source_count=news.source_count,  # Number of sources reporting
                related_sources=news.related_sources,  # Other sources reporting same news
                importance_score=stage4.final_score if stage4 else 5.0,
                relevance_reason=relevance_reason,
                ai_summary=ai_summary,  # AI-generated article summary
                affected_symbols=stage2.affected_symbols if stage2 else [],
                symbol_impacts=stage2.symbol_impacts if stage2 else None,  # Per-symbol impact analysis
                predicted_impact=predicted_impact,
                impact_direction=stage2.impact_direction if stage2 else None,
                supply_chain_impact=supply_chain_impact,
                competitor_impact=competitor_impact,
                verification_passed=stage3.verification_passed if stage3 else True,
                verification_details=stage3.correlation_check if stage3 else None,
                analysis_stage_1=asdict(item.stage1) if item.stage1 else None,
                analysis_stage_2=asdict(stage2) if stage2 else None,
                analysis_stage_3=asdict(stage3) if stage3 else None,
                analysis_stage_4=asdict(stage4) if stage4 else None,
            )
            self.db.add(curated)

        self.db.commit()
        print(f"Saved {len(curated_items)} curated news items with Japanese translations")

    async def _create_daily_digest(self, results: Dict[str, Any]) -> None:
        """Create daily digest record."""
        from models import DailyDigest

        digest_date = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        collection_stats = results["steps"].get("collection", {})
        dedup_stats = results["steps"].get("deduplication", {})
        analysis_stats = results["steps"].get("analysis", {})

        # Check for existing digest
        existing = self.db.query(DailyDigest).filter(
            DailyDigest.digest_date == digest_date
        ).first()

        if existing:
            # Update existing
            existing.total_raw_news = collection_stats.get("total_collected", 0)
            existing.total_merged_news = dedup_stats.get("merged_count", 0)
            existing.total_curated_news = analysis_stats.get("total_curated", 0)
            existing.processing_time_seconds = results.get("processing_time_seconds")
            existing.regional_distribution = collection_stats.get("regional_balance", {}).get("regional_stats")
            existing.status = results.get("status", "completed")
            existing.error_message = results.get("error")
        else:
            # Create new
            digest = DailyDigest(
                digest_date=digest_date,
                total_raw_news=collection_stats.get("total_collected", 0),
                total_merged_news=dedup_stats.get("merged_count", 0),
                total_curated_news=analysis_stats.get("total_curated", 0),
                processing_time_seconds=results.get("processing_time_seconds"),
                regional_distribution=collection_stats.get("regional_balance", {}).get("regional_stats"),
                status=results.get("status", "completed"),
                error_message=results.get("error"),
            )
            self.db.add(digest)

        self.db.commit()
        print("Daily digest saved")

    async def _get_registered_symbols(self) -> List[str]:
        """Get registered symbols from database."""
        from models import MonitorTarget

        targets = self.db.query(MonitorTarget).filter(
            MonitorTarget.is_active == True
        ).all()

        return [t.symbol for t in targets]


async def run_batch(db: Session, hours_back: int = 24) -> Dict[str, Any]:
    """Convenience function to run a batch."""
    processor = NewsBatchProcessor(db)
    return await processor.run_daily_batch(hours_back=hours_back)
