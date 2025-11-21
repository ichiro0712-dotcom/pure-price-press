/**
 * Type definitions for Pure Price Press
 */

export type ConditionOperator = "AND" | "OR";

export interface MonitorCondition {
  id?: number;
  interval_minutes: number;
  threshold_percent: number;
  operator?: ConditionOperator; // この条件の前に適用される演算子（最初の条件はnull）
}

export interface MonitorTarget {
  id: number;
  symbol: string;
  name: string | null;
  interval_minutes: number; // 後方互換性のため残す（デフォルト条件）
  threshold_percent: number; // 後方互換性のため残す（デフォルト条件）
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
  interval_minutes?: number;
  threshold_percent?: number;
  conditions?: MonitorCondition[];
  is_active?: boolean;
}

export interface MonitorTargetUpdate {
  name?: string;
  interval_minutes?: number;
  threshold_percent?: number;
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
