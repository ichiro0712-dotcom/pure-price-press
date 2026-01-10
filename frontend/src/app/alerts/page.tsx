"use client";

import React, { useState } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import Skeleton from "@/components/Skeleton";
import { Bell, ArrowLeft, Filter } from "lucide-react";
import Link from "next/link";

export default function AlertsPage() {
  const { data: alerts = [], isLoading } = useAlerts({ limit: 100 });
  const [filterSymbol, setFilterSymbol] = useState<string>("");

  // Get unique symbols for filter
  const uniqueSymbols = [...new Set(alerts.map((alert) => alert.symbol))].sort();

  // Filter alerts
  const filteredAlerts = filterSymbol
    ? alerts.filter((alert) => alert.symbol === filterSymbol)
    : alerts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">アラート一覧</h1>
          <p className="text-sm text-gray-400">
            過去すべてのアラート履歴
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          className="input text-sm py-2"
        >
          <option value="">すべての銘柄</option>
          {uniqueSymbols.map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol}
            </option>
          ))}
        </select>
        {filterSymbol && (
          <button
            onClick={() => setFilterSymbol("")}
            className="text-sm text-brand-accent hover:text-brand-accent/80"
          >
            クリア
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-400">
        {filteredAlerts.length}件のアラート
        {filterSymbol && ` (${filterSymbol})`}
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <Skeleton variant="card" count={10} />
      ) : filteredAlerts.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            アラートがありません
          </h3>
          <p className="text-sm text-gray-400">
            {filterSymbol
              ? `${filterSymbol}のアラートはまだありません`
              : "アラートが発生するとここに表示されます"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="card p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.change_rate > 0
                        ? "bg-green-500/20"
                        : "bg-red-500/20"
                    }`}
                  >
                    <span
                      className={`text-xl font-bold ${
                        alert.change_rate > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {alert.change_rate > 0 ? "↑" : "↓"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">{alert.symbol}</span>
                      <span
                        className={`text-base font-semibold ${
                          alert.change_rate > 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {alert.change_rate > 0 ? "+" : ""}
                        {alert.change_rate.toFixed(2)}%
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          alert.alert_type === "surge"
                            ? "bg-green-500/20 text-green-500"
                            : alert.alert_type === "drop"
                            ? "bg-red-500/20 text-red-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        }`}
                      >
                        {alert.alert_type === "surge"
                          ? "急騰"
                          : alert.alert_type === "drop"
                          ? "急落"
                          : "変動"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-400 flex-wrap">
                      <span>
                        ${alert.price_before.toFixed(2)} → ${alert.price_after.toFixed(2)}
                      </span>
                      <span>
                        ({alert.change_amount > 0 ? "+" : ""}
                        {alert.change_amount.toFixed(2)})
                      </span>
                    </div>
                    {alert.ai_analysis_text && (
                      <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                        {alert.ai_analysis_text}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-400 flex-shrink-0">
                  <div>
                    {new Date(alert.triggered_at).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div>
                    {new Date(alert.triggered_at).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
