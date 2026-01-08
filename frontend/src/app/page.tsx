"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTargets, useUpdateTarget, useDeleteTarget, useReorderTargets } from "@/hooks/useTargets";
import { useAlerts } from "@/hooks/useAlerts";
import { useDashboardStats } from "@/hooks/useDashboard";
import { usePriceDataBatch } from "@/hooks/usePriceData";
import { queryKeys } from "@/lib/queryClient";
import type { MonitorTarget } from "@/lib/types";
import TargetListItem from "@/components/TargetListItem";
import Skeleton from "@/components/Skeleton";
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  Bell,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function Dashboard() {
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: targets = [], isLoading: targetsLoading, isFetching: targetsFetching } = useTargets();
  const { data: alerts = [] } = useAlerts(50);
  const { data: stats } = useDashboardStats();
  const { priceData } = usePriceDataBatch(targets, targets.length > 0);

  // Mutations
  const updateTarget = useUpdateTarget();
  const deleteTarget = useDeleteTarget();
  const reorderTargets = useReorderTargets();

  // Local UI state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localTargets, setLocalTargets] = useState<MonitorTarget[] | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Use local targets during drag, otherwise use query data
  const displayTargets = localTargets ?? targets;

  const handleRefresh = () => {
    // 手動更新時はキャッシュを無効化して再取得
    queryClient.invalidateQueries({ queryKey: queryKeys.targets });
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    // 価格データも再取得
    targets.forEach((target) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targetPrice(target.id) });
    });
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    updateTarget.mutate({ id, data: { is_active: isActive } });
  };

  const handleDelete = async (id: number) => {
    deleteTarget.mutate(id);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    setLocalTargets([...targets]);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || !localTargets) return;

    const newTargets = [...localTargets];
    const draggedItem = newTargets[draggedIndex];
    newTargets.splice(draggedIndex, 1);
    newTargets.splice(index, 0, draggedItem);

    setLocalTargets(newTargets);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null && localTargets) {
      const targetIds = localTargets.map((t) => t.id);
      reorderTargets.mutate(targetIds);
    }
    setDraggedIndex(null);
    setLocalTargets(null);
  };

  // Get alert count for each symbol
  const getAlertCountForSymbol = (symbol: string) => {
    return alerts.filter((alert) => alert.symbol === symbol).length;
  };

  // Get latest alert for a symbol
  const getLatestAlertForSymbol = (symbol: string) => {
    const symbolAlerts = alerts.filter((alert) => alert.symbol === symbol);
    if (symbolAlerts.length === 0) return null;
    return symbolAlerts.reduce((latest, alert) =>
      new Date(alert.triggered_at) > new Date(latest.triggered_at) ? alert : latest
    );
  };

  // Group targets by category
  const getTargetsByCategory = () => {
    const grouped: Record<string, MonitorTarget[]> = {};
    displayTargets.forEach((target) => {
      const category = target.category || "未分類";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(target);
    });
    return grouped;
  };

  // Toggle category collapse
  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const targetsByCategory = getTargetsByCategory();
  const categories = Object.keys(targetsByCategory);
  const isRefreshing = targetsFetching;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-4 sm:py-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-gradient mb-2 sm:mb-4">
          Pure Price Press
        </h1>
        <p className="text-sm sm:text-lg text-foreground-secondary max-w-2xl mx-auto px-2">
          マーケット変動から主要ニュースをピックアップ、重要度を数値化
        </p>
      </div>

      {/* Stats Cards */}
      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <div className="card p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-accent/20 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-brand-accent" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.total_targets}</p>
                <p className="text-[10px] sm:text-xs text-foreground-muted">監視銘柄</p>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.active_targets}</p>
                <p className="text-[10px] sm:text-xs text-foreground-muted">稼働中</p>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.total_alerts}</p>
                <p className="text-[10px] sm:text-xs text-foreground-muted">総アラート</p>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.alerts_today}</p>
                <p className="text-[10px] sm:text-xs text-foreground-muted">本日</p>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-6 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500/20 rounded-lg flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.critical_alerts}</p>
                <p className="text-[10px] sm:text-xs text-foreground-muted">緊急 (24h)</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Skeleton variant="stats" count={5} />
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Left Column - Registered Stocks */}
        <div className="lg:col-span-1 order-1">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-2xl font-bold">登録銘柄一覧</h2>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-secondary flex items-center gap-1 sm:gap-2 text-sm px-2 sm:px-4 py-1.5 sm:py-2"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">更新</span>
            </button>
          </div>

          {targetsLoading ? (
            <Skeleton variant="card" count={5} />
          ) : displayTargets.length === 0 ? (
            <div className="card text-center py-8 sm:py-12 px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-foreground-muted" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground-muted mb-2">
                銘柄がまだ登録されていません
              </h3>
              <p className="text-xs sm:text-sm text-foreground-muted mb-3 sm:mb-4">
                銘柄登録ページから監視する銘柄を追加してください
              </p>
              <a href="/targets" className="btn btn-primary inline-block text-sm sm:text-base px-4 py-2">
                銘柄登録へ
              </a>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] sm:max-h-[700px] overflow-y-auto pr-1 sm:pr-2">
              {categories.map((category) => (
                <div key={category} className="border border-foreground/10 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-background-secondary hover:bg-background-tertiary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {collapsedCategories.has(category) ? (
                        <ChevronRight className="w-4 h-4 text-foreground-muted" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-foreground-muted" />
                      )}
                      <span className="text-sm font-semibold">{category}</span>
                      <span className="text-xs text-foreground-muted">
                        ({targetsByCategory[category].length})
                      </span>
                    </div>
                  </button>

                  {/* Category Items */}
                  {!collapsedCategories.has(category) && (
                    <div className="divide-y divide-foreground/5">
                      {targetsByCategory[category].map((target) => {
                        const globalIndex = displayTargets.findIndex((t) => t.id === target.id);
                        return (
                          <TargetListItem
                            key={target.id}
                            target={target}
                            index={globalIndex}
                            alertCount={getAlertCountForSymbol(target.symbol)}
                            latestAlert={getLatestAlertForSymbol(target.symbol)}
                            priceData={priceData[target.id] || null}
                            isDragging={draggedIndex === globalIndex}
                            showDragHandle={true}
                            showToggle={true}
                            showDelete={true}
                            showConditions={false}
                            showYahooLink={true}
                            compact={true}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                            onToggleActive={handleToggleActive}
                            onDelete={handleDelete}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - NEWS */}
        <div className="lg:col-span-2 order-2">
          <div className="mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-2xl font-bold">NEWS</h2>
            <p className="text-xs sm:text-sm text-foreground-muted mt-0.5 sm:mt-1">
              重要度の高いニュースから順に表示
            </p>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-foreground-muted" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground-muted mb-2">
                ニュース機能は準備中です
              </h3>
              <p className="text-xs sm:text-sm text-foreground-muted px-4">
                アラート発生時に関連ニュースを自動収集し、重要度順に表示します
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
