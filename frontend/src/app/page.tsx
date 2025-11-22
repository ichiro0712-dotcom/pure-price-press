"use client";

import React, { useEffect, useState } from "react";
import { monitorTargetsApi, alertsApi, dashboardApi } from "@/lib/api";
import type { MonitorTarget, AlertHistory, DashboardStats } from "@/lib/types";
import AlertTimeline from "@/components/AlertTimeline";
import MonitorCard from "@/components/MonitorCard";
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  Bell,
} from "lucide-react";
import { formatLargeNumber } from "@/lib/utils";

export default function Dashboard() {
  const [targets, setTargets] = useState<MonitorTarget[]>([]);
  const [alerts, setAlerts] = useState<AlertHistory[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [targetsData, alertsData, statsData] = await Promise.all([
        monitorTargetsApi.getAll(),
        alertsApi.getAll({ limit: 50 }),
        dashboardApi.getStats(),
      ]);

      setTargets(targetsData);
      setAlerts(alertsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await monitorTargetsApi.update(id, { is_active: isActive });
      await fetchData();
    } catch (error) {
      console.error("Failed to toggle target:", error);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    try {
      await alertsApi.delete(id);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete alert:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await monitorTargetsApi.delete(id);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete target:", error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gradient mb-4">
          Pure Price Press
        </h1>
        <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
          マーケット変動から主要ニュースをピックアップ、重要度を数値化
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-brand-accent/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-brand-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_targets}</p>
                <p className="text-xs text-foreground-muted">監視銘柄数</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active_targets}</p>
                <p className="text-xs text-foreground-muted">稼働中</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_alerts}</p>
                <p className="text-xs text-foreground-muted">総アラート数</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.alerts_today}</p>
                <p className="text-xs text-foreground-muted">本日</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.critical_alerts}</p>
                <p className="text-xs text-foreground-muted">緊急 (24時間)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Alert Stocks */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">アラート銘柄</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              更新
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-16"></div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-foreground-muted" />
              </div>
              <h3 className="text-lg font-semibold text-foreground-muted mb-2">
                アラートはまだありません
              </h3>
              <p className="text-sm text-foreground-muted mb-4">
                銘柄登録ページから監視する銘柄を追加してください
              </p>
              <a href="/targets" className="btn btn-primary inline-block">
                銘柄登録へ
              </a>
            </div>
          ) : (
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2">
              {alerts.slice(0, 50).map((alert) => (
                <div
                  key={alert.id}
                  className="card hover:border-brand-accent/50 transition-colors p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-bold text-foreground truncate">
                          {alert.symbol}
                        </span>
                        <span
                          className={`text-sm font-semibold whitespace-nowrap ${
                            alert.change_rate > 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {alert.change_rate > 0 ? "↑" : "↓"}{" "}
                          {Math.abs(alert.change_rate).toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted">
                        {new Date(alert.triggered_at).toLocaleString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="text-foreground-muted hover:text-red-500 transition-colors px-2 py-1 text-lg flex-shrink-0"
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - NEWS */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">NEWS</h2>
            <p className="text-sm text-foreground-muted mt-1">
              重要度の高いニュースから順に表示
            </p>
          </div>

          <div className="card">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-foreground-muted" />
              </div>
              <h3 className="text-lg font-semibold text-foreground-muted mb-2">
                ニュース機能は準備中です
              </h3>
              <p className="text-sm text-foreground-muted">
                アラート発生時に関連ニュースを自動収集し、重要度順に表示します
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
