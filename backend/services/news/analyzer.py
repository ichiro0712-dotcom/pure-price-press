"""
News analyzer module.
Multi-stage LLM analysis pipeline for news importance scoring.
"""
import os
import json
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from .deduplicator import MergedNewsItem


@dataclass
class AnalysisStage1Result:
    """Stage 1: Screening result."""
    news_id: str
    passed: bool
    relevance_score: float  # 1-10
    category: str
    brief_reason: str


@dataclass
class AnalysisStage2Result:
    """Stage 2: Deep analysis result."""
    news_id: str
    importance_score: float  # 1-10
    affected_symbols: List[str]
    predicted_impact: str
    impact_direction: str  # positive, negative, mixed, uncertain
    supply_chain_analysis: str
    competitor_analysis: str
    key_points: List[str]
    ai_summary: str = ""  # AI-generated article summary
    symbol_impacts: Dict[str, Dict[str, str]] = field(default_factory=dict)  # Per-symbol impact analysis


@dataclass
class AnalysisStage3Result:
    """Stage 3: Verification result."""
    news_id: str
    verification_passed: bool
    correlation_check: Dict[str, Any]  # Symbol correlation verification
    consistency_score: float  # 0-1
    issues_found: List[str]


@dataclass
class AnalysisStage4Result:
    """Stage 4: Final judgment result."""
    news_id: str
    final_score: float  # 1-10, adjusted
    final_rank: int
    display_recommendation: str
    summary_for_user: str


@dataclass
class CuratedNewsResult:
    """Final curated news item."""
    merged_news: MergedNewsItem
    stage1: AnalysisStage1Result
    stage2: AnalysisStage2Result
    stage3: AnalysisStage3Result
    stage4: AnalysisStage4Result


class NewsAnalyzer:
    """
    Multi-stage LLM analysis pipeline.

    Stages:
    1. Screening: Quick relevance check (60→30 articles)
    2. Deep Analysis: Detailed impact prediction
    3. Verification: Cross-check predictions with real data
    4. Final Judgment: Ranking and user-facing summary
    """

    def __init__(self, llm_provider: str = "gemini"):
        self.llm_provider = llm_provider
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")

        # Lazy import LLM client
        self._client = None
        self._model = None

    def _get_client(self):
        """Get or create LLM client."""
        if self._client is not None:
            return self._client

        # Try Gemini first (using new google-genai package)
        if self.gemini_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.gemini_key)
                self._model = "gemini-2.0-flash"  # Use latest flash model
                self.llm_provider = "gemini"
                print("Using Gemini for analysis")
                return self._client
            except ImportError:
                print("Google GenAI package not installed")

        # Fallback to OpenAI
        if self.openai_key:
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self.openai_key)
                self.llm_provider = "openai"
                print("Using OpenAI for analysis")
                return self._client
            except ImportError:
                print("OpenAI package not installed")

        # Legacy anthropic support
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=self.anthropic_key)
                return self._client
            except ImportError:
                print("Anthropic package not installed")

        return None

    async def analyze_batch(
        self,
        news_items: List[MergedNewsItem],
        registered_symbols: List[str],
    ) -> List[CuratedNewsResult]:
        """
        Run full analysis pipeline on news batch.

        Args:
            news_items: Merged news items to analyze
            registered_symbols: User's registered stock symbols

        Returns:
            List of curated news results
        """
        results = []

        # Stage 1: Screening
        print(f"Stage 1: Screening {len(news_items)} articles...")
        stage1_results = await self._stage1_screening(news_items)
        passed_stage1 = [r for r in stage1_results if r.passed]
        print(f"  → {len(passed_stage1)} articles passed screening")

        # Get news items that passed
        passed_items = {r.news_id: r for r in passed_stage1}
        news_for_stage2 = [n for n in news_items if n.id in passed_items]

        # Stage 2: Deep Analysis
        print(f"Stage 2: Deep analysis on {len(news_for_stage2)} articles...")
        stage2_results = await self._stage2_deep_analysis(news_for_stage2, registered_symbols)
        stage2_map = {r.news_id: r for r in stage2_results}

        # Stage 3: Verification
        print(f"Stage 3: Verification...")
        stage3_results = await self._stage3_verification(
            news_for_stage2, stage2_results, registered_symbols
        )
        stage3_map = {r.news_id: r for r in stage3_results}

        # Stage 4: Final Judgment
        print(f"Stage 4: Final judgment...")
        stage4_results = await self._stage4_final_judgment(
            news_for_stage2, stage2_results, stage3_results
        )
        stage4_map = {r.news_id: r for r in stage4_results}

        # Combine all results
        for news in news_for_stage2:
            if news.id in passed_items and news.id in stage2_map:
                results.append(
                    CuratedNewsResult(
                        merged_news=news,
                        stage1=passed_items[news.id],
                        stage2=stage2_map.get(news.id),
                        stage3=stage3_map.get(news.id),
                        stage4=stage4_map.get(news.id),
                    )
                )

        # Sort by final score
        results.sort(key=lambda x: x.stage4.final_score if x.stage4 else 0, reverse=True)

        return results

    async def _stage1_screening(
        self, news_items: List[MergedNewsItem]
    ) -> List[AnalysisStage1Result]:
        """
        Stage 1: Quick screening to filter irrelevant news.

        Criteria:
        - Financial/market relevance
        - Potential impact on stocks
        - Newsworthiness
        """
        results = []
        client = self._get_client()

        if not client:
            # Fallback: pass all items with default scores
            return [
                AnalysisStage1Result(
                    news_id=item.id,
                    passed=True,
                    relevance_score=5.0,
                    category=item.category or "general",
                    brief_reason="Auto-passed (no LLM available)",
                )
                for item in news_items
            ]

        # Process in batches for efficiency
        batch_size = 10
        for i in range(0, len(news_items), batch_size):
            batch = news_items[i:i + batch_size]
            batch_results = await self._screen_batch(batch)
            results.extend(batch_results)

        return results

    async def _screen_batch(
        self, news_items: List[MergedNewsItem]
    ) -> List[AnalysisStage1Result]:
        """Screen a batch of news items."""
        client = self._get_client()
        if not client:
            return []

        # Prepare news list for LLM
        news_list = "\n".join([
            f"[{i+1}] {item.title} (Source: {item.source})"
            for i, item in enumerate(news_items)
        ])

        prompt = f"""You are a financial news analyst. Evaluate each news headline for investment relevance.

NEWS HEADLINES:
{news_list}

For each headline, provide:
1. relevance_score (1-10): How relevant is this for investors?
2. category: monetary_policy, fiscal_policy, earnings, mergers_acquisitions, regulation, geopolitics, technology, commodities, macro_data, or other
3. passed: true if score >= 5, false otherwise
4. brief_reason: 1 sentence explanation in Japanese (日本語で)

Respond in JSON format:
{{
  "results": [
    {{"index": 1, "relevance_score": 8, "category": "technology", "passed": true, "brief_reason": "AI関連の重要発表がテクノロジーセクター全体に影響"}},
    ...
  ]
}}"""

        try:
            if self.llm_provider == "gemini":
                # Gemini API (new google-genai package)
                from google.genai import types
                response = client.models.generate_content(
                    model=self._model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                        response_mime_type="application/json",
                    )
                )
                content = response.text
            elif self.llm_provider == "openai":
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.3,
                )
                content = response.choices[0].message.content
            else:
                # Anthropic fallback
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}],
                )
                content = response.content[0].text

            data = json.loads(content)
            results = []
            for item in data.get("results", []):
                idx = item.get("index", 1) - 1
                if 0 <= idx < len(news_items):
                    results.append(
                        AnalysisStage1Result(
                            news_id=news_items[idx].id,
                            passed=item.get("passed", False),
                            relevance_score=float(item.get("relevance_score", 0)),
                            category=item.get("category", "other"),
                            brief_reason=item.get("brief_reason", ""),
                        )
                    )
            return results

        except Exception as e:
            print(f"Error in stage 1 screening: {e}")
            # Fallback: pass all with default scores
            return [
                AnalysisStage1Result(
                    news_id=item.id,
                    passed=True,
                    relevance_score=5.0,
                    category="other",
                    brief_reason=f"Error during analysis: {str(e)[:50]}",
                )
                for item in news_items
            ]

    async def _stage2_deep_analysis(
        self,
        news_items: List[MergedNewsItem],
        registered_symbols: List[str],
    ) -> List[AnalysisStage2Result]:
        """
        Stage 2: Deep analysis for impact prediction.
        """
        results = []
        client = self._get_client()

        if not client:
            return [
                AnalysisStage2Result(
                    news_id=item.id,
                    importance_score=5.0,
                    affected_symbols=[],
                    predicted_impact="Analysis not available",
                    impact_direction="uncertain",
                    supply_chain_analysis="N/A",
                    competitor_analysis="N/A",
                    key_points=["LLM not configured"],
                )
                for item in news_items
            ]

        symbols_str = ", ".join(registered_symbols[:20]) if registered_symbols else "No specific symbols"

        for item in news_items:
            result = await self._analyze_single(item, symbols_str)
            results.append(result)

        return results

    async def _analyze_single(
        self, news: MergedNewsItem, symbols_str: str
    ) -> AnalysisStage2Result:
        """Analyze a single news item in depth."""
        client = self._get_client()
        if not client:
            return AnalysisStage2Result(
                news_id=news.id,
                importance_score=5.0,
                affected_symbols=[],
                predicted_impact="N/A",
                impact_direction="uncertain",
                supply_chain_analysis="N/A",
                competitor_analysis="N/A",
                key_points=[],
            )

        prompt = f"""You are a senior financial analyst. Analyze this news for investment impact.

NEWS:
Title: {news.title}
Source: {news.source} (reported by {news.source_count} sources)
Summary: {news.summary or 'Not available'}

USER'S WATCHLIST: {symbols_str}

Analyze and provide (all text fields in Japanese / 日本語で):
1. importance_score (1-10): Overall importance for investors
2. ai_summary: A concise 2-3 sentence summary of the news article (日本語で)
3. affected_symbols: List of stock symbols likely affected (from watchlist or major companies)
4. symbol_impacts: For each affected symbol, provide direction and analysis (日本語で)
5. predicted_impact: What market impact do you expect? (日本語で)
6. impact_direction: positive, negative, mixed, or uncertain
7. supply_chain_analysis: How might supply chains be affected? (日本語で)
8. competitor_analysis: Which competitors benefit or suffer? (日本語で)
9. key_points: 3 bullet points summarizing the key takeaways (日本語で)

Respond in JSON format:
{{
  "importance_score": 8,
  "ai_summary": "AppleがAI機能を搭載した新型iPhoneを発表。半導体需要の増加が期待される。",
  "affected_symbols": ["AAPL", "TSM", "NVDA"],
  "symbol_impacts": {{
    "AAPL": {{"direction": "positive", "analysis": "新製品発表で売上増加が期待される"}},
    "TSM": {{"direction": "positive", "analysis": "チップ供給需要増でメリット"}},
    "NVDA": {{"direction": "positive", "analysis": "AI関連需要増で好影響"}}
  }},
  "predicted_impact": "半導体株の上昇が予想される...",
  "impact_direction": "positive",
  "supply_chain_analysis": "台湾のサプライヤーへの発注増加が見込まれる...",
  "competitor_analysis": "Intelは市場シェアを失う可能性がある...",
  "key_points": ["ポイント1", "ポイント2", "ポイント3"]
}}"""

        try:
            if self.llm_provider == "gemini":
                # Gemini API (new google-genai package)
                from google.genai import types
                response = client.models.generate_content(
                    model=self._model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                        response_mime_type="application/json",
                    )
                )
                content = response.text
            elif self.llm_provider == "openai":
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.3,
                )
                content = response.choices[0].message.content
            else:
                # Anthropic fallback
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}],
                )
                content = response.content[0].text

            data = json.loads(content)
            return AnalysisStage2Result(
                news_id=news.id,
                importance_score=float(data.get("importance_score", 5)),
                affected_symbols=data.get("affected_symbols", []),
                predicted_impact=data.get("predicted_impact", ""),
                impact_direction=data.get("impact_direction", "uncertain"),
                supply_chain_analysis=data.get("supply_chain_analysis", ""),
                competitor_analysis=data.get("competitor_analysis", ""),
                key_points=data.get("key_points", []),
                ai_summary=data.get("ai_summary", ""),
                symbol_impacts=data.get("symbol_impacts", {}),
            )

        except Exception as e:
            print(f"Error in stage 2 analysis: {e}")
            return AnalysisStage2Result(
                news_id=news.id,
                importance_score=5.0,
                affected_symbols=[],
                predicted_impact=f"Error: {str(e)[:100]}",
                impact_direction="uncertain",
                supply_chain_analysis="N/A",
                competitor_analysis="N/A",
                key_points=[],
                ai_summary="",
                symbol_impacts={},
            )

    async def _stage3_verification(
        self,
        news_items: List[MergedNewsItem],
        stage2_results: List[AnalysisStage2Result],
        registered_symbols: List[str],
    ) -> List[AnalysisStage3Result]:
        """
        Stage 3: Verify predictions against logic and correlations.

        Checks:
        - If AAPL drops, does it make sense for TSM to drop too?
        - Are the supply chain relationships correct?
        - Are there logical inconsistencies?
        """
        results = []

        # Create mapping of news to stage2 results
        stage2_map = {r.news_id: r for r in stage2_results}

        for news in news_items:
            stage2 = stage2_map.get(news.id)
            if not stage2:
                continue

            # Verify correlation logic
            verification = self._verify_correlations(stage2)

            results.append(
                AnalysisStage3Result(
                    news_id=news.id,
                    verification_passed=verification["passed"],
                    correlation_check=verification["details"],
                    consistency_score=verification["score"],
                    issues_found=verification["issues"],
                )
            )

        return results

    def _verify_correlations(self, stage2: AnalysisStage2Result) -> Dict[str, Any]:
        """Verify the logic of predicted correlations."""
        issues = []
        score = 1.0

        # Check for logical consistency
        if stage2.impact_direction == "positive" and "drop" in stage2.predicted_impact.lower():
            issues.append("Inconsistent: positive direction but mentions drop")
            score -= 0.2

        if stage2.impact_direction == "negative" and "rise" in stage2.predicted_impact.lower():
            issues.append("Inconsistent: negative direction but mentions rise")
            score -= 0.2

        # Check supply chain logic
        if len(stage2.affected_symbols) > 10:
            issues.append("Too many affected symbols may indicate overgeneralization")
            score -= 0.1

        # For now, basic validation (in production, would check real correlations)
        passed = score >= 0.7 and len(issues) < 3

        return {
            "passed": passed,
            "score": max(0, score),
            "issues": issues,
            "details": {
                "symbols_checked": stage2.affected_symbols,
                "direction": stage2.impact_direction,
            },
        }

    async def _stage4_final_judgment(
        self,
        news_items: List[MergedNewsItem],
        stage2_results: List[AnalysisStage2Result],
        stage3_results: List[AnalysisStage3Result],
    ) -> List[AnalysisStage4Result]:
        """
        Stage 4: Final ranking and user-facing summary.
        """
        results = []
        stage2_map = {r.news_id: r for r in stage2_results}
        stage3_map = {r.news_id: r for r in stage3_results}

        # Calculate final scores
        scored_items = []
        for news in news_items:
            stage2 = stage2_map.get(news.id)
            stage3 = stage3_map.get(news.id)

            if not stage2:
                continue

            # Calculate final score with adjustments
            base_score = stage2.importance_score
            boost = news.importance_boost  # From source count

            # Apply verification penalty
            if stage3 and not stage3.verification_passed:
                base_score *= 0.8  # 20% penalty for failed verification

            # Apply consistency score
            if stage3:
                base_score *= stage3.consistency_score

            final_score = min(10, base_score * boost)

            scored_items.append({
                "news": news,
                "stage2": stage2,
                "stage3": stage3,
                "final_score": final_score,
            })

        # Sort by final score
        scored_items.sort(key=lambda x: x["final_score"], reverse=True)

        # Assign ranks and create results
        for rank, item in enumerate(scored_items, 1):
            news = item["news"]
            stage2 = item["stage2"]
            final_score = item["final_score"]

            # Generate user-facing summary
            if final_score >= 8:
                recommendation = "必見"
            elif final_score >= 6:
                recommendation = "重要"
            elif final_score >= 4:
                recommendation = "参考"
            else:
                recommendation = "低優先"

            # Create summary for user
            key_points = stage2.key_points if stage2.key_points else []
            summary = f"{stage2.predicted_impact[:200]}..." if len(stage2.predicted_impact) > 200 else stage2.predicted_impact

            results.append(
                AnalysisStage4Result(
                    news_id=news.id,
                    final_score=round(final_score, 2),
                    final_rank=rank,
                    display_recommendation=recommendation,
                    summary_for_user=summary,
                )
            )

        return results

    def get_analysis_stats(self, results: List[CuratedNewsResult]) -> Dict[str, Any]:
        """Get statistics about the analysis run."""
        return {
            "total_curated": len(results),
            "by_recommendation": {
                "必見": len([r for r in results if r.stage4 and r.stage4.display_recommendation == "必見"]),
                "重要": len([r for r in results if r.stage4 and r.stage4.display_recommendation == "重要"]),
                "参考": len([r for r in results if r.stage4 and r.stage4.display_recommendation == "参考"]),
                "低優先": len([r for r in results if r.stage4 and r.stage4.display_recommendation == "低優先"]),
            },
            "avg_score": sum(r.stage4.final_score for r in results if r.stage4) / len(results) if results else 0,
            "verification_pass_rate": len([r for r in results if r.stage3 and r.stage3.verification_passed]) / len(results) if results else 0,
        }
