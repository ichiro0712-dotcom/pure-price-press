/**
 * Type definitions for Pure Price Press
 */

export type ConditionOperator = "AND" | "OR";
export type ChangeDirection = "both" | "increase" | "decrease";

export interface MonitorCondition {
  id?: number;
  interval_minutes: number;
  threshold_percent: number;
  direction?: ChangeDirection; // 変動方向（both: 両方向, increase: 上昇のみ, decrease: 下落のみ）
  operator?: ConditionOperator | null; // この条件の前に適用される演算子（最初の条件はnull）
}

export interface MonitorTarget {
  id: number;
  symbol: string;
  name: string | null;
  category: string | null; // カテゴリー
  interval_minutes: number; // 後方互換性のため残す（デフォルト条件）
  threshold_percent: number; // 後方互換性のため残す（デフォルト条件）
  direction: ChangeDirection; // 変動方向
  conditions?: MonitorCondition[]; // 複数の監視条件
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_price: number | null;
  last_check_at: string | null;
}

export interface MonitorTargetCreate {
  symbol: string;
  name?: string;
  category?: string;
  interval_minutes?: number;
  threshold_percent?: number;
  direction?: ChangeDirection;
  conditions?: MonitorCondition[];
  is_active?: boolean;
}

export interface MonitorTargetUpdate {
  name?: string;
  category?: string;
  interval_minutes?: number;
  threshold_percent?: number;
  direction?: ChangeDirection;
  conditions?: MonitorCondition[];
  is_active?: boolean;
}

export interface AlertHistory {
  id: number;
  symbol: string;
  price_before: number;
  price_after: number;
  change_rate: number;
  change_amount: number;
  ai_analysis_text: string | null;
  alert_type: "surge" | "drop" | "volatility";
  triggered_at: string;
  notified: boolean;
  notification_error: string | null;
  volume: number | null;
  market_cap: number | null;
  news_headlines: string | null;
}

export interface AlertHistoryCreate {
  symbol: string;
  price_before: number;
  price_after: number;
  change_rate: number;
  change_amount: number;
  ai_analysis_text?: string;
  alert_type?: string;
  volume?: number;
  market_cap?: number;
  news_headlines?: string;
}

export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
  is_set?: boolean; // 値が設定されているかどうか（マスク時の判定用）
}

export interface DashboardStats {
  total_targets: number;
  active_targets: number;
  total_alerts: number;
  alerts_today: number;
  critical_alerts: number;
}

export interface MessageResponse {
  message: string;
  success?: boolean;
}

export interface ErrorResponse {
  detail: string;
  error_code?: string;
}

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface PriceData {
  time: number;
  value: number;
}

export interface TargetPriceData {
  symbol: string;
  current_price: number | null;
  day_change: number | null;
  month_change: number | null;
  year_change: number | null;
  error?: string;
}

// News Feature Types
export interface SymbolImpact {
  direction: "positive" | "negative" | "mixed" | "uncertain" | null;
  analysis: string | null;
}

export interface CuratedNews {
  id: number;
  title: string;
  url: string;
  source: string;
  region: string;
  category: string | null;
  published_at: string | null; // Original article publication time
  source_count: number; // Number of sources reporting this news
  related_sources: string[] | null; // Other sources reporting same news
  importance_score: number;
  relevance_reason: string;
  ai_summary: string | null; // AI-generated article summary
  affected_symbols: string[] | null;
  symbol_impacts: Record<string, SymbolImpact> | null; // Per-symbol impact analysis
  predicted_impact: string | null;
  impact_direction: "positive" | "negative" | "mixed" | "uncertain" | null;
  supply_chain_impact: string | null;
  competitor_impact: string | null;
  verification_passed: boolean;
  digest_date: string;
  created_at: string;
  // Display duration and importance tracking
  first_seen_at: string | null;
  last_seen_at: string | null;
  reporting_days: number;
  is_pinned: boolean;
  pinned_at: string | null;
  effective_score: number | null;
  // Computed display info (from API)
  remaining_display_time: string | null;
  score_label: string | null;
  score_color: string | null;
}

export interface DailyDigest {
  id: number;
  digest_date: string;
  total_raw_news: number;
  total_merged_news: number;
  total_curated_news: number;
  processing_time_seconds: number | null;
  regional_distribution: Record<string, number> | null;
  category_distribution: Record<string, number> | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface NewsListResponse {
  news: CuratedNews[];
  digest: DailyDigest | null;
  total_count: number;
}

export interface NewsBatchRunResponse {
  batch_id: string;
  status: string;
  message: string;
  processing_time_seconds: number | null;
  total_collected: number | null;
  total_curated: number | null;
}
