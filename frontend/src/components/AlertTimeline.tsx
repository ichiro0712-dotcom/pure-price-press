"use client";

import React from "react";
import Link from "next/link";
import type { AlertHistory } from "@/lib/types";
import {
  formatRelativeTime,
  formatAbsoluteTime,
  formatPercent,
  formatCurrency,
  getAlertSeverity,
  getAlertSeverityLabel,
  getChangeRateColorClass,
  cn,
} from "@/lib/utils";
import { TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";

interface AlertTimelineProps {
  alerts: AlertHistory[];
  loading?: boolean;
  maxItems?: number;
}

export default function AlertTimeline({
  alerts,
  loading = false,
  maxItems,
}: AlertTimelineProps) {
  const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-6 bg-white/10 rounded w-1/4 mb-3"></div>
            <div className="h-4 bg-white/10 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (displayAlerts.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">
          まだアラートがありません
        </h3>
        <p className="text-sm text-gray-400">
          価格変動を検知するとここにアラートが表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayAlerts.map((alert, index) => {
        const severity = getAlertSeverity(alert.change_rate);
        const isPositive = alert.change_rate > 0;

        return (
          <Link
            key={alert.id}
            href={`/alert/${alert.id}`}
            className="block"
          >
            <div
              className={cn(
                "card card-hover border-l-4 animate-fade-in",
                severity === "critical" && "border-l-critical",
                severity === "high" && "border-l-orange-500",
                severity === "medium" && "border-l-yellow-500",
                severity === "low" && "border-l-blue-500"
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      isPositive
                        ? "bg-surge/20 text-surge"
                        : "bg-drop/20 text-drop"
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>

                  {/* Symbol and Type */}
                  <div>
                    <h3 className="font-bold text-lg">{alert.symbol}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(alert.triggered_at)}
                    </p>
                  </div>
                </div>

                {/* Severity Badge */}
                <div
                  className={cn(
                    "badge",
                    severity === "critical" && "severity-critical",
                    severity === "high" && "severity-high",
                    severity === "medium" && "severity-medium",
                    severity === "low" && "severity-low"
                  )}
                >
                  {getAlertSeverityLabel(severity)}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-3">
                {/* Change Rate */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">変動率</p>
                  <p
                    className={cn(
                      "text-xl font-bold",
                      getChangeRateColorClass(alert.change_rate)
                    )}
                  >
                    {formatPercent(alert.change_rate)}
                  </p>
                </div>

                {/* Price Before */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">変動前</p>
                  <p className="text-sm font-mono">
                    {formatCurrency(alert.price_before)}
                  </p>
                </div>

                {/* Price After */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">変動後</p>
                  <p className="text-sm font-mono">
                    {formatCurrency(alert.price_after)}
                  </p>
                </div>
              </div>

              {/* AI Analysis Preview */}
              {alert.ai_analysis_text && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs font-semibold text-brand-accent mb-2">
                    📰 Pure Price Press 分析
                  </p>
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {alert.ai_analysis_text}
                  </p>
                </div>
              )}

              {/* Footer - Timestamp */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {formatAbsoluteTime(alert.triggered_at)}
                </p>
                {alert.notified && (
                  <span className="text-xs text-green-500">✓ 通知済み</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
