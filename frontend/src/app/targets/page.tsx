"use client";

import React, { useState, useEffect } from "react";
import { monitorTargetsApi } from "@/lib/api";
import type { MonitorTarget, MonitorTargetCreate, MonitorCondition, ConditionOperator } from "@/lib/types";
import MonitorCard from "@/components/MonitorCard";
import {
  INTERVAL_OPTIONS,
  DEFAULT_INTERVAL,
  DEFAULT_THRESHOLD,
} from "@/lib/intervals";
import {
  Plus,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";

export default function TargetsPage() {
  const [targets, setTargets] = useState<MonitorTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state for new target
  const [newTarget, setNewTarget] = useState<MonitorTargetCreate>({
    symbol: "",
    name: "",
    is_active: true,
  });

  // 監視条件のリスト（最初の条件にはoperatorなし）
  const [conditions, setConditions] = useState<MonitorCondition[]>([
    {
      interval_minutes: DEFAULT_INTERVAL,
      threshold_percent: DEFAULT_THRESHOLD,
    },
  ]);

  const fetchTargets = async () => {
    try {
      const data = await monitorTargetsApi.getAll();
      setTargets(data);
    } catch (error) {
      console.error("Failed to fetch targets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 条件を含めて送信
      await monitorTargetsApi.create({
        ...newTarget,
        conditions: conditions,
      });
      showMessage("success", `${newTarget.symbol} を追加しました`);

      // Reset form
      setNewTarget({
        symbol: "",
        name: "",
        is_active: true,
      });
      setConditions([
        {
          interval_minutes: DEFAULT_INTERVAL,
          threshold_percent: DEFAULT_THRESHOLD,
        },
      ]);

      // Refresh targets
      await fetchTargets();
    } catch (error: any) {
      showMessage(
        "error",
        error.detail || "銘柄の追加に失敗しました。もう一度お試しください。"
      );
    } finally {
      setSaving(false);
    }
  };

  // 条件を追加（デフォルトはAND）
  const handleAddCondition = (operator: ConditionOperator = "AND") => {
    setConditions([
      ...conditions,
      {
        interval_minutes: DEFAULT_INTERVAL,
        threshold_percent: DEFAULT_THRESHOLD,
        operator: operator,
      },
    ]);
  };

  // 条件を削除
  const handleRemoveCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  // 条件を更新
  const handleUpdateCondition = (
    index: number,
    field: keyof MonitorCondition,
    value: number | ConditionOperator
  ) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  // グループ分け関数
  const getConditionGroups = () => {
    const groups: MonitorCondition[][] = [];
    let currentGroup: MonitorCondition[] = [];

    conditions.forEach((condition, index) => {
      if (index === 0 || condition.operator === "AND") {
        currentGroup.push(condition);
      } else {
        // ORが来たら新しいグループを開始
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [condition];
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await monitorTargetsApi.update(id, { is_active: isActive });
      await fetchTargets();
    } catch (error) {
      showMessage("error", "銘柄の更新に失敗しました");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await monitorTargetsApi.delete(id);
      showMessage("success", "銘柄を削除しました");
      await fetchTargets();
    } catch (error) {
      showMessage("error", "銘柄の削除に失敗しました");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">銘柄登録</h1>
        <p className="text-foreground-muted">
          監視する銘柄の追加と管理
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`card border-l-4 ${
            message.type === "success"
              ? "border-l-green-500 bg-green-500/10"
              : "border-l-red-500 bg-red-500/10"
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        </div>
      )}

      {/* Add New Target */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-accent/20 rounded-lg flex items-center justify-center">
            <Plus className="w-5 h-5 text-brand-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold">新規銘柄を追加</h2>
            <p className="text-sm text-foreground-muted">
              価格変動を監視する銘柄を追加
            </p>
          </div>
        </div>

        <form onSubmit={handleAddTarget} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Symbol */}
            <div>
              <label className="block text-sm font-medium mb-2">
                シンボル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="例: AAPL, TSLA, ^DJI"
                value={newTarget.symbol}
                onChange={(e) =>
                  setNewTarget({
                    ...newTarget,
                    symbol: e.target.value.toUpperCase(),
                  })
                }
                required
              />
              <p className="text-xs text-foreground-muted mt-1">
                株式ティッカーシンボル（自動的に大文字に変換されます）
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                名前（任意）
              </label>
              <input
                type="text"
                className="input"
                placeholder="例: Apple Inc."
                value={newTarget.name}
                onChange={(e) =>
                  setNewTarget({ ...newTarget, name: e.target.value })
                }
              />
              <p className="text-xs text-foreground-muted mt-1">
                銘柄の表示名
              </p>
            </div>

          </div>

          {/* 監視条件 */}
          <div className="border-t border-foreground/10 pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold">監視条件</h3>
              <p className="text-xs text-foreground-muted mt-1">
                条件を追加し、AND（かつ）／OR（または）で組み合わせます。連続するANDはグループ化されます。
              </p>
            </div>

            {/* グループ表示 */}
            <div className="space-y-4">
              {getConditionGroups().map((group, groupIndex) => (
                <div key={groupIndex}>
                  {/* グループの枠 */}
                  <div className="border-2 border-brand-accent/30 rounded-lg p-4 bg-brand-accent/5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-brand-accent/20 text-brand-accent">
                        グループ {groupIndex + 1}
                      </span>
                      {group.length > 1 && (
                        <span className="text-xs text-foreground-muted">
                          （すべての条件を満たす）
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {group.map((condition) => {
                        const conditionIndex = conditions.indexOf(condition);
                        return (
                          <div key={conditionIndex}>
                            {/* AND/ORセレクター（最初の条件以外） */}
                            {conditionIndex > 0 && (
                              <div className="flex items-center gap-2 mb-2">
                                <select
                                  className="input w-32 text-sm"
                                  value={condition.operator || "AND"}
                                  onChange={(e) =>
                                    handleUpdateCondition(
                                      conditionIndex,
                                      "operator",
                                      e.target.value as ConditionOperator
                                    )
                                  }
                                >
                                  <option value="AND">AND（かつ）</option>
                                  <option value="OR">OR（または）</option>
                                </select>
                                <span className="text-xs text-foreground-muted">
                                  {condition.operator === "OR"
                                    ? "→ 新しいグループを開始"
                                    : "→ 同じグループ内"}
                                </span>
                              </div>
                            )}

                            {/* 条件の設定 */}
                            <div className="bg-background-secondary rounded-lg p-4 flex items-center gap-4">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Interval */}
                                <div>
                                  <label className="block text-xs font-medium mb-2">
                                    チェック間隔
                                  </label>
                                  <select
                                    className="input w-full"
                                    value={condition.interval_minutes}
                                    onChange={(e) =>
                                      handleUpdateCondition(
                                        conditionIndex,
                                        "interval_minutes",
                                        parseInt(e.target.value)
                                      )
                                    }
                                  >
                                    {INTERVAL_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Threshold */}
                                <div>
                                  <label className="block text-xs font-medium mb-2">
                                    アラート閾値（%）
                                  </label>
                                  <input
                                    type="number"
                                    className="input w-full"
                                    min="0.1"
                                    max="100"
                                    step="0.1"
                                    value={condition.threshold_percent}
                                    onChange={(e) =>
                                      handleUpdateCondition(
                                        conditionIndex,
                                        "threshold_percent",
                                        parseFloat(e.target.value)
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              {/* Delete Button */}
                              {conditions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCondition(conditionIndex)}
                                  className="btn btn-danger"
                                  title="この条件を削除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* グループ間の OR表示 */}
                  {groupIndex < getConditionGroups().length - 1 && (
                    <div className="flex items-center justify-center my-3">
                      <span className="px-4 py-2 bg-brand-accent/20 text-brand-accent font-bold rounded-lg text-sm">
                        OR（いずれか）
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* 条件を追加ボタン */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleAddCondition("AND")}
                  className="px-3 py-1.5 text-sm rounded-lg bg-background-tertiary hover:bg-foreground/10 text-foreground transition-all duration-200 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  AND条件を追加
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCondition("OR")}
                  className="px-3 py-1.5 text-sm rounded-lg bg-background-tertiary hover:bg-foreground/10 text-foreground transition-all duration-200 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  OR条件を追加（新グループ）
                </button>
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={newTarget.is_active}
              onChange={(e) =>
                setNewTarget({ ...newTarget, is_active: e.target.checked })
              }
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm">
              すぐに監視を開始
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving || !newTarget.symbol}
            className="btn btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="spinner"></div>
                追加中...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                銘柄を追加
              </>
            )}
          </button>
        </form>
      </div>

      {/* Existing Targets */}
      <div>
        <h2 className="text-2xl font-bold mb-4">登録済み銘柄</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48"></div>
              </div>
            ))}
          </div>
        ) : targets.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-foreground-muted">
              まだ銘柄がありません。上のフォームから最初の銘柄を追加してください
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  );
}
