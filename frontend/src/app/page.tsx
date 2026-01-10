"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTargets, useUpdateTarget, useDeleteTarget, useReorderTargets } from "@/hooks/useTargets";
import { useAlerts } from "@/hooks/useAlerts";
import { useDashboardStats } from "@/hooks/useDashboard";
import { usePriceDataBatch } from "@/hooks/usePriceData";
import { useNews } from "@/hooks/useNews";
import { queryKeys } from "@/lib/queryClient";
import type { MonitorTarget } from "@/lib/types";
import TargetListItem from "@/components/TargetListItem";
import NewsCard from "@/components/NewsCard";
import Skeleton from "@/components/Skeleton";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  TrendingUp,
  Activity,
  RefreshCw,
  Bell,
  ChevronDown,
  ChevronRight,
  Newspaper,
  AlertTriangle,
} from "lucide-react";

export default function Dashboard() {
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: targets = [], isLoading: targetsLoading, isFetching: targetsFetching, isError: targetsError } = useTargets();
  const { data: alerts = [], isError: alertsError } = useAlerts({ limit: 50 });
  const { data: stats, isError: statsError } = useDashboardStats();
  const { priceData } = usePriceDataBatch(targets, targets.length > 0);
  const { data: newsData, isLoading: newsLoading, isError: newsError } = useNews({ limit: 5 });

  // Mutations
  const updateTarget = useUpdateTarget();
  const deleteTarget = useDeleteTarget();
  const reorderTargets = useReorderTargets();

  // Local UI state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localTargets, setLocalTargets] = useState<MonitorTarget[] | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; target: MonitorTarget | null }>({
    isOpen: false,
    target: null,
  });

  // Use local targets during drag, otherwise use query data
  const displayTargets = localTargets ?? targets;

  const handleRefresh = () => {
    // 手動更新時はキャッシュを無効化して再取得
    queryClient.invalidateQueries({ queryKey: queryKeys.targets });
    queryClient.invalidateQueries({ queryKey: queryKeys.alertsBase });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    // 価格データも再取得
    targets.forEach((target) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targetPrice(target.id) });
    });
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    updateTarget.mutate({ id, data: { is_active: isActive } });
  };

  const handleDeleteRequest = (id: number) => {
    const target = targets.find((t) => t.id === id);
    if (target) {
      setDeleteConfirm({ isOpen: true, target });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.target) {
      deleteTarget.mutate(deleteConfirm.target.id);
    }
    setDeleteConfirm({ isOpen: false, target: null });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, target: null });
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
        <p className="text-sm sm:text-lg text-gray-300 max-w-2xl mx-auto px-2">
          マーケット変動から主要ニュースをピックアップ、重要度を数値化
        </p>
      </div>

      {/* Stats Cards */}
      {statsError ? (
        <div className="card p-4 bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-3 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm">統計データの取得に失敗しました</p>
            <button
              onClick={handleRefresh}
              className="ml-auto text-xs underline hover:no-underline"
            >
              再試行
            </button>
          </div>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-4 max-w-md">
          <div className="card p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-accent/20 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-brand-accent" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{stats.active_targets}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">監視銘柄</p>
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
                <p className="text-[10px] sm:text-xs text-gray-400">過去30日アラート</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Skeleton variant="stats" count={2} />
      )}

      {/* NEWS Section - Full Width */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold">NEWS</h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
              重要度の高いニュースから順に表示
            </p>
          </div>
          {newsData && newsData.news.length > 0 && (
            <a
              href="/news"
              className="text-sm text-brand-accent hover:text-brand-accent/80 transition-colors"
            >
              すべて表示 →
            </a>
          )}
        </div>

        {newsError ? (
          <div className="card p-4 bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm">ニュースの取得に失敗しました</p>
              <button
                onClick={handleRefresh}
                className="ml-auto text-xs underline hover:no-underline"
              >
                再試行
              </button>
            </div>
          </div>
        ) : newsLoading ? (
          <Skeleton variant="card" count={3} />
        ) : newsData && newsData.news.length > 0 ? (
          <div className="space-y-2">
            {newsData.news.map((news) => (
              <NewsCard key={news.id} news={news} compact />
            ))}
          </div>
        ) : (
          <div className="card p-4 sm:p-6">
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Newspaper className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-400 mb-2">
                ニュースはまだありません
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 px-4">
                ニュースバッチ処理を実行すると、重要度順にニュースが表示されます
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alerts Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-2xl font-bold">アラート</h2>
          <a
            href="/alerts"
            className="text-sm text-brand-accent hover:text-brand-accent/80 transition-colors"
          >
            さらに表示 →
          </a>
        </div>

        {alertsError ? (
          <div className="card p-4 bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm">アラートの取得に失敗しました</p>
              <button
                onClick={handleRefresh}
                className="ml-auto text-xs underline hover:no-underline"
              >
                再試行
              </button>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="card p-4 sm:p-6 text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400">アラートはまだありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="card p-3 sm:p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                      alert.change_rate > 0
                        ? "bg-green-500/20"
                        : "bg-red-500/20"
                    }`}
                  >
                    <span
                      className={`text-lg font-bold ${
                        alert.change_rate > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {alert.change_rate > 0 ? "↑" : "↓"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base">{alert.symbol}</span>
                      <span
                        className={`text-sm sm:text-base font-semibold ${
                          alert.change_rate > 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {alert.change_rate > 0 ? "+" : ""}
                        {alert.change_rate.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      ${alert.price_after.toFixed(2)} • {new Date(alert.triggered_at).toLocaleString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registered Stocks Section - Full Width */}
      <div>
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

        {targetsError ? (
          <div className="card p-4 bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm">銘柄データの取得に失敗しました</p>
              <button
                onClick={handleRefresh}
                className="ml-auto text-xs underline hover:no-underline"
              >
                再試行
              </button>
            </div>
          </div>
        ) : targetsLoading ? (
          <Skeleton variant="card" count={5} />
        ) : displayTargets.length === 0 ? (
          <div className="card text-center py-8 sm:py-12 px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-400 mb-2">
              銘柄がまだ登録されていません
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
              銘柄登録ページから監視する銘柄を追加してください
            </p>
            <a href="/targets" className="btn btn-primary inline-block text-sm sm:text-base px-4 py-2">
              銘柄登録へ
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category} className="border border-white/10 rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-900 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {collapsedCategories.has(category) ? (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-semibold">{category}</span>
                    <span className="text-xs text-gray-400">
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
                          onDelete={handleDeleteRequest}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="銘柄を削除しますか？"
        message={`${deleteConfirm.target?.symbol ?? ""}${deleteConfirm.target?.name ? ` (${deleteConfirm.target.name})` : ""} を削除します。この操作は取り消せません。`}
        confirmLabel="削除"
        cancelLabel="キャンセル"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
