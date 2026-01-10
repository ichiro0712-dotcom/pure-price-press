"use client";

import React from "react";
import type { MonitorTarget, AlertHistory, TargetPriceData } from "@/lib/types";
import {
  GripVertical,
  Trash2,
  Bell,
  ExternalLink,
} from "lucide-react";

interface TargetListItemProps {
  target: MonitorTarget;
  index: number;
  alertCount?: number;
  latestAlert?: AlertHistory | null;
  priceData?: TargetPriceData | null;
  isDragging?: boolean;
  showDragHandle?: boolean;
  showToggle?: boolean;
  showDelete?: boolean;
  showConditions?: boolean;
  showYahooLink?: boolean;
  compact?: boolean;
  onDragStart?: (index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
  onToggleActive?: (id: number, isActive: boolean) => void;
  onDelete?: (id: number) => void;
  onClick?: (target: MonitorTarget) => void;
}

export default function TargetListItem({
  target,
  index,
  alertCount = 0,
  latestAlert = null,
  priceData = null,
  isDragging = false,
  showDragHandle = true,
  showToggle = true,
  showDelete = true,
  showConditions = true,
  showYahooLink = false,
  compact = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onToggleActive,
  onDelete,
  onClick,
}: TargetListItemProps) {
  const openYahooFinanceChart = (symbol: string) => {
    window.open(`https://finance.yahoo.com/quote/${symbol}`, "_blank");
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (showYahooLink) {
      openYahooFinanceChart(target.symbol);
    } else if (onClick) {
      onClick(target);
    }
  };

  const formatInterval = (minutes: number) => {
    if (minutes >= 1440) {
      return `${Math.floor(minutes / 1440)}${compact ? "d" : "日"}`;
    } else if (minutes >= 60) {
      return `${Math.floor(minutes / 60)}${compact ? "h" : "時間"}`;
    }
    return `${minutes}${compact ? "m" : "分"}`;
  };

  return (
    <div
      draggable={showDragHandle}
      onDragStart={() => onDragStart?.(index)}
      onDragOver={(e) => onDragOver?.(e, index)}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
      className={`card hover:border-brand-accent/50 transition-all cursor-pointer p-2.5 sm:p-3 ${
        isDragging ? "opacity-50" : ""
      } ${alertCount > 0 ? "border-l-4 border-l-yellow-500" : ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
        {/* Mobile: Top row with Symbol + Controls */}
        <div className="flex items-center gap-2 sm:hidden">
          {showDragHandle && (
            <div className="text-gray-400" aria-label="ドラッグして並び替え" role="button" tabIndex={0}>
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <span className="text-sm font-bold flex-1">{target.symbol}</span>
          {alertCount > 0 && (
            <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
              <Bell className="w-2.5 h-2.5" />
              {alertCount}
            </span>
          )}
          {latestAlert && (
            <span
              className={`text-[10px] font-semibold whitespace-nowrap ${
                latestAlert.change_rate > 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {latestAlert.change_rate > 0 ? "↑" : "↓"}{" "}
              {Math.abs(latestAlert.change_rate).toFixed(2)}%
            </span>
          )}
          {!target.is_active && (
            <span className="text-[10px] text-gray-400 bg-white/10 px-1.5 py-0.5 rounded">
              停止中
            </span>
          )}
          {showToggle && onToggleActive && (
            <label
              className="relative inline-flex items-center cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={target.is_active}
                onChange={(e) => onToggleActive(target.id, e.target.checked)}
                className="sr-only peer"
                aria-label={`${target.symbol}の監視を${target.is_active ? "停止" : "開始"}`}
              />
              <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-accent"></div>
            </label>
          )}
          {showDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(target.id);
              }}
              className="h-5 w-5 flex items-center justify-center rounded bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
              aria-label={`${target.symbol}を削除`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {showYahooLink && (
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          )}
        </div>

        {/* Desktop: Drag Handle */}
        {showDragHandle && (
          <div
            className="hidden sm:block text-gray-400 hover:text-white transition-colors cursor-grab"
            aria-label="ドラッグして並び替え"
            role="button"
            tabIndex={0}
          >
            <GripVertical className="w-5 h-5" />
          </div>
        )}

        {/* Symbol & Name & Price Data */}
        <div className="flex-1 min-w-0">
          <div className="hidden sm:flex items-center gap-2 mb-0.5">
            <span className="text-sm sm:text-base font-bold">{target.symbol}</span>
            {target.name && (
              <span className="text-xs sm:text-sm text-gray-400 truncate">
                {target.name}
              </span>
            )}
            {alertCount > 0 && (
              <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-500 text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-semibold">
                <Bell className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {alertCount}
              </span>
            )}
            {latestAlert && (
              <span
                className={`text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                  latestAlert.change_rate > 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {latestAlert.change_rate > 0 ? "↑" : "↓"}{" "}
                {Math.abs(latestAlert.change_rate).toFixed(2)}%
              </span>
            )}
            {!target.is_active && (
              <span className="text-[10px] sm:text-xs text-gray-400 bg-white/10 px-1.5 py-0.5 rounded">
                停止中
              </span>
            )}
          </div>

          {/* Mobile: Name only */}
          {target.name && (
            <p className="text-xs text-gray-400 truncate sm:hidden mb-1">
              {target.name}
            </p>
          )}

          {/* Price Data */}
          {priceData && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              {priceData.current_price !== null && (
                <div className="font-semibold">
                  ${priceData.current_price.toFixed(2)}
                </div>
              )}
              {priceData.day_change !== null && (
                <div
                  className={`flex items-center gap-0.5 sm:gap-1 ${
                    priceData.day_change > 0
                      ? "text-green-500"
                      : priceData.day_change < 0
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  <span className="hidden sm:inline">前日比:</span>
                  <span className="sm:hidden">日:</span>
                  <span className="font-semibold">
                    {priceData.day_change > 0 ? "+" : ""}
                    {priceData.day_change.toFixed(1)}%
                  </span>
                </div>
              )}
              {priceData.month_change !== null && (
                <div
                  className={`flex items-center gap-0.5 sm:gap-1 ${
                    priceData.month_change > 0
                      ? "text-green-500"
                      : priceData.month_change < 0
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  <span className="hidden sm:inline">前月比:</span>
                  <span className="sm:hidden">月:</span>
                  <span className="font-semibold">
                    {priceData.month_change > 0 ? "+" : ""}
                    {priceData.month_change.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Mobile: Compact condition display + Latest alert info */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5 sm:hidden text-[10px]">
            {showConditions && (
              <>
                <span className="px-1.5 py-0.5 bg-brand-accent/20 text-brand-accent rounded">
                  {formatInterval(target.interval_minutes)}
                </span>
                <span className="px-1.5 py-0.5 bg-white/10 rounded">
                  {target.threshold_percent}%
                </span>
                <span className="px-1.5 py-0.5 bg-white/10 rounded">
                  {target.direction === "increase"
                    ? "↑"
                    : target.direction === "decrease"
                    ? "↓"
                    : "↕"}
                </span>
                {target.conditions && target.conditions.length > 1 && (
                  <span className="text-gray-400">
                    +{target.conditions.length - 1}条件
                  </span>
                )}
              </>
            )}
            {latestAlert && (
              <span className="text-gray-400">
                最終:{" "}
                {new Date(latestAlert.triggered_at).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Desktop: Alert Conditions (Right side) */}
        {showConditions && (
          <div className="hidden sm:block space-y-1">
            {/* Primary condition */}
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8"></div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">間隔:</span>
                  <span className="font-semibold">
                    {formatInterval(target.interval_minutes)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">閾値:</span>
                  <span className="font-semibold text-brand-accent">
                    {target.threshold_percent}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">方向:</span>
                  <span className="font-semibold">
                    {target.direction === "increase"
                      ? "↑"
                      : target.direction === "decrease"
                      ? "↓"
                      : "↕"}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional conditions */}
            {target.conditions && target.conditions.length > 1 && (
              <>
                {target.conditions.slice(1).map((condition, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <div className="w-8 text-center">
                      {condition.operator && (
                        <span
                          className={`text-xs font-bold ${
                            condition.operator === "OR"
                              ? "text-brand-accent"
                              : "text-green-500"
                          }`}
                        >
                          {condition.operator}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">間隔:</span>
                        <span className="font-semibold">
                          {formatInterval(condition.interval_minutes)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">閾値:</span>
                        <span className="font-semibold text-brand-accent">
                          {condition.threshold_percent}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">方向:</span>
                        <span className="font-semibold">
                          {condition.direction === "increase"
                            ? "↑"
                            : condition.direction === "decrease"
                            ? "↓"
                            : "↕"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Latest alert info for dashboard */}
            {latestAlert && (
              <div className="text-[10px] sm:text-xs text-gray-400 mt-1">
                最終アラート:{" "}
                {new Date(latestAlert.triggered_at).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        )}

        {/* Desktop: Controls */}
        <div className="hidden sm:flex items-center gap-2">
          {showToggle && onToggleActive && (
            <label
              className="relative inline-flex items-center cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={target.is_active}
                onChange={(e) => onToggleActive(target.id, e.target.checked)}
                className="sr-only peer"
                aria-label={`${target.symbol}の監視を${target.is_active ? "停止" : "開始"}`}
              />
              <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
              <span className="ml-2 text-xs text-gray-400 whitespace-nowrap">
                {target.is_active ? "ON" : "OFF"}
              </span>
            </label>
          )}
          {showDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(target.id);
              }}
              className="h-6 w-6 flex items-center justify-center rounded bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
              aria-label={`${target.symbol}を削除`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {showYahooLink && (
            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
