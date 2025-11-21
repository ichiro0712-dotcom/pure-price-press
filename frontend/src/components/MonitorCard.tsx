"use client";

import React, { useState } from "react";
import type { MonitorTarget } from "@/lib/types";
import {
  formatCurrency,
  formatRelativeTime,
  formatAbsoluteTime,
  cn,
} from "@/lib/utils";
import { formatInterval } from "@/lib/intervals";
import {
  Activity,
  Clock,
  TrendingUp,
  Settings,
  Trash2,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
} from "lucide-react";

interface MonitorCardProps {
  target: MonitorTarget;
  onToggleActive?: (id: number, isActive: boolean) => void;
  onDelete?: (id: number) => void;
  onEdit?: (id: number) => void;
}

export default function MonitorCard({
  target,
  onToggleActive,
  onDelete,
  onEdit,
}: MonitorCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleActive = async () => {
    if (!onToggleActive || isToggling) return;
    setIsToggling(true);
    try {
      await onToggleActive(target.id, !target.is_active);
    } catch (error) {
      console.error("Failed to toggle active state:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    if (!confirm(`${target.symbol}の監視を削除しますか?`)) return;

    setIsDeleting(true);
    try {
      await onDelete(target.id);
    } catch (error) {
      console.error("Failed to delete target:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        "card card-hover relative",
        !target.is_active && "opacity-60",
        isDeleting && "animate-pulse"
      )}
    >
      {/* Status Indicator */}
      <div className="absolute top-4 right-4">
        {target.is_active ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-500 font-medium">稼働中</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-foreground-muted rounded-full"></div>
            <span className="text-xs text-foreground-muted font-medium">
              停止中
            </span>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-brand-accent rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-black" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{target.symbol}</h3>
            {target.name && (
              <p className="text-sm text-foreground-muted">{target.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="bg-background-tertiary rounded-lg p-3 mb-4">
        <p className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          最終価格
        </p>
        <p className="text-lg font-mono font-bold">
          {target.last_price
            ? formatCurrency(target.last_price)
            : "取得中..."}
        </p>
        {target.last_check_at && (
          <p className="text-xs text-foreground-muted mt-1">
            {formatRelativeTime(target.last_check_at)}
          </p>
        )}
      </div>

      {/* 監視条件 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-brand-accent" />
          <p className="text-xs font-semibold text-foreground-muted">
            監視条件 ({target.conditions?.length || 1}件)
          </p>
        </div>

        {target.conditions && target.conditions.length > 0 ? (
          (() => {
            // グループ分け
            const groups: typeof target.conditions[] = [];
            let currentGroup: typeof target.conditions = [];

            target.conditions.forEach((condition, index) => {
              if (index === 0 || condition.operator === "AND") {
                currentGroup.push(condition);
              } else {
                if (currentGroup.length > 0) {
                  groups.push(currentGroup);
                }
                currentGroup = [condition];
              }
            });

            if (currentGroup.length > 0) {
              groups.push(currentGroup);
            }

            return (
              <div className="space-y-2">
                {groups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <div className="border border-brand-accent/30 rounded-lg p-2 bg-brand-accent/5">
                      {group.length > 1 && (
                        <div className="text-[10px] text-brand-accent font-bold mb-1">
                          グループ{groupIndex + 1} (AND)
                        </div>
                      )}
                      <div className="space-y-1">
                        {group.map((condition, condIndex) => (
                          <div
                            key={condIndex}
                            className="bg-background-tertiary rounded p-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-foreground-muted">間隔</span>
                              <span className="font-medium">
                                {formatInterval(condition.interval_minutes)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-foreground-muted">閾値</span>
                              <span className="font-bold text-brand-accent">
                                ±{condition.threshold_percent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {groupIndex < groups.length - 1 && (
                      <div className="flex justify-center my-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-accent/20 text-brand-accent rounded">
                          OR
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <div className="bg-background-tertiary rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-foreground-muted">間隔</span>
              <span className="font-medium">
                {formatInterval(target.interval_minutes)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-foreground-muted">閾値</span>
              <span className="font-bold text-brand-accent">
                ±{target.threshold_percent.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-foreground/10">
        {/* Toggle Active */}
        <button
          onClick={handleToggleActive}
          disabled={isToggling}
          className={cn(
            "flex-1 btn flex items-center justify-center gap-2",
            target.is_active ? "btn-secondary" : "btn-primary"
          )}
        >
          {isToggling ? (
            <div className="spinner"></div>
          ) : target.is_active ? (
            <>
              <PauseCircle className="w-4 h-4" />
              停止
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              再開
            </>
          )}
        </button>

        {/* Edit */}
        {onEdit && (
          <button
            onClick={() => onEdit(target.id)}
            className="btn btn-secondary"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Delete */}
        {onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn btn-danger"
          >
            {isDeleting ? (
              <div className="spinner"></div>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
