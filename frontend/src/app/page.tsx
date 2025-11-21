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
        alertsApi.getAll({ limit: 10 }),
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
          バイアスのかかっていない真実のニュースをお金の動きから分析する
        </p>
        <p className="text-sm text-foreground-muted mt-2">
          価格は事実、ニュースは解釈
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
        {/* Left Column - Monitor Targets */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">監視銘柄</h2>
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
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-32"></div>
                </div>
              ))}
            </div>
          ) : targets.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-foreground-muted" />
              </div>
              <h3 className="text-lg font-semibold text-foreground-muted mb-2">
                まだ銘柄がありません
              </h3>
              <p className="text-sm text-foreground-muted mb-4">
                銘柄登録ページから監視する銘柄を追加してください
              </p>
              <a href="/targets" className="btn btn-primary inline-block">
                銘柄登録へ
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {targets.map((target) => (
                <MonitorCard
                  key={target.id}
                  target={target}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Alert Timeline */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">最新アラート</h2>
            <p className="text-sm text-foreground-muted mt-1">
              Pure Price Pressが検知した最新の価格変動
            </p>
          </div>

          <AlertTimeline alerts={alerts} loading={loading} />

          {!loading && alerts.length > 0 && (
            <div className="mt-6 text-center">
              <a
                href="/alerts"
                className="text-brand-accent hover:text-brand-gold transition-colors"
              >
                すべてのアラートを見る →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
