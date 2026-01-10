/**
 * Utility functions for Pure Price Press
 */

import type { AlertSeverity, AlertHistory } from "./types";
import { clsx, type ClassValue } from "clsx";

/**
 * Merge class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format number as currency
 */
export function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format number as percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return "just now";
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  } else {
    return past.toLocaleDateString();
  }
}

/**
 * Format date to absolute time
 */
export function formatAbsoluteTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get alert severity based on change rate
 */
export function getAlertSeverity(changeRate: number): AlertSeverity {
  const abs = Math.abs(changeRate);
  if (abs >= 10) return "critical";
  if (abs >= 7) return "high";
  if (abs >= 5) return "medium";
  return "low";
}

/**
 * Get alert severity label
 */
export function getAlertSeverityLabel(severity: AlertSeverity): string {
  const labels = {
    critical: "🚨 CRITICAL",
    high: "⚠️ HIGH",
    medium: "📊 MEDIUM",
    low: "ℹ️ LOW",
  };
  return labels[severity];
}

/**
 * Get alert type label
 */
export function getAlertTypeLabel(
  alertType: string,
  changeRate: number
): string {
  if (changeRate > 0) {
    return "📈 Surge";
  } else {
    return "📉 Drop";
  }
}

/**
 * Get color class for change rate
 */
export function getChangeRateColorClass(changeRate: number): string {
  if (changeRate > 0) {
    return "text-surge";
  } else if (changeRate < 0) {
    return "text-drop";
  }
  return "text-gray-400";
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number = 100): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
