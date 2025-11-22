"use client";

import React, { useState, useEffect } from "react";
import { monitorTargetsApi } from "@/lib/api";
import type { MonitorTarget, MonitorTargetCreate, MonitorCondition, ConditionOperator, ChangeDirection, TargetPriceData } from "@/lib/types";
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
  GripVertical,
  Edit,
  X,
} from "lucide-react";

export default function TargetsPage() {
  const [targets, setTargets] = useState<MonitorTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [priceData, setPriceData] = useState<Record<number, TargetPriceData>>({});
  const [editingTarget, setEditingTarget] = useState<MonitorTarget | null>(null);
  const [editConditions, setEditConditions] = useState<MonitorCondition[]>([]);

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
      direction: "both",
    },
  ]);

  const fetchTargets = async () => {
    try {
      const data = await monitorTargetsApi.getAll();
      setTargets(data);

      // Fetch price data for all targets
      const pricePromises = data.map(async (target) => {
        try {
          const price = await monitorTargetsApi.getPrice(target.id);
          return { id: target.id, data: price };
        } catch (error) {
          console.error(`Failed to fetch price for ${target.symbol}:`, error);
          return null;
        }
      });

      const prices = await Promise.all(pricePromises);
      const priceMap: Record<number, TargetPriceData> = {};
      prices.forEach((item) => {
        if (item) {
          priceMap[item.id] = item.data;
        }
      });
      setPriceData(priceMap);
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
          direction: "both",
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
        direction: "both",
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
    value: number | ConditionOperator | ChangeDirection
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

  // ドラッグ&ドロップハンドラー
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTargets = [...targets];
    const draggedItem = newTargets[draggedIndex];
    newTargets.splice(draggedIndex, 1);
    newTargets.splice(index, 0, draggedItem);

    setTargets(newTargets);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // 編集モーダルを開く
  const handleEdit = (target: MonitorTarget) => {
    setEditingTarget(target);
    // 既存の条件を編集用にセット（なければデフォルト条件）
    if (target.conditions && target.conditions.length > 0) {
      setEditConditions(target.conditions);
    } else {
      setEditConditions([
        {
          interval_minutes: target.interval_minutes,
          threshold_percent: target.threshold_percent,
          direction: target.direction || "both",
        },
      ]);
    }
  };

  // 編集モーダルを閉じる
  const handleCloseEdit = () => {
    setEditingTarget(null);
    setEditConditions([]);
  };

  // 編集を保存
  const handleSaveEdit = async () => {
    if (!editingTarget) return;

    try {
      setSaving(true);

      // 条件の準備：最初の条件のoperatorは常にnullにする
      const preparedConditions = editConditions.map((cond, index) => ({
        ...cond,
        operator: index === 0 ? null : cond.operator,
      }));

      await monitorTargetsApi.update(editingTarget.id, {
        name: editingTarget.name || undefined,
        interval_minutes: preparedConditions[0].interval_minutes,
        threshold_percent: preparedConditions[0].threshold_percent,
        direction: preparedConditions[0].direction,
        conditions: preparedConditions.length > 0 ? preparedConditions : undefined,
        is_active: editingTarget.is_active,
      });

      await fetchTargets();
      showMessage("success", "銘柄を更新しました");
      handleCloseEdit();
    } catch (error) {
      console.error("Update error:", error);
      showMessage("error", "銘柄の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // 編集用条件を追加
  const handleAddEditCondition = (operator: ConditionOperator = "AND") => {
    setEditConditions([
      ...editConditions,
      {
        interval_minutes: DEFAULT_INTERVAL,
        threshold_percent: DEFAULT_THRESHOLD,
        direction: "both",
        operator: operator,
      },
    ]);
  };

  // 編集用条件を削除
  const handleRemoveEditCondition = (index: number) => {
    if (editConditions.length > 1) {
      const filtered = editConditions.filter((_, i) => i !== index);
      // 最初の条件のoperatorは常にnullにする
      if (filtered.length > 0) {
        filtered[0] = { ...filtered[0], operator: undefined };
      }
      setEditConditions(filtered);
    }
  };

  // 編集用条件を更新
  const handleUpdateEditCondition = (
    index: number,
    field: keyof MonitorCondition,
    value: number | ConditionOperator | ChangeDirection
  ) => {
    const updated = [...editConditions];
    updated[index] = { ...updated[index], [field]: value };
    setEditConditions(updated);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">アラート登録</h1>
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
            <h2 className="text-xl font-bold">新規アラートを追加</h2>
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
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
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

                                {/* Direction */}
                                <div>
                                  <label className="block text-xs font-medium mb-2">
                                    変動方向
                                  </label>
                                  <select
                                    className="input w-full"
                                    value={condition.direction || "both"}
                                    onChange={(e) =>
                                      handleUpdateCondition(
                                        conditionIndex,
                                        "direction",
                                        e.target.value as ChangeDirection
                                      )
                                    }
                                  >
                                    <option value="both">↕ 両方向</option>
                                    <option value="increase">↑ 上昇のみ</option>
                                    <option value="decrease">↓ 下落のみ</option>
                                  </select>
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
                追加
              </>
            )}
          </button>
        </form>
      </div>

      {/* Existing Targets */}
      <div>
        <h2 className="text-2xl font-bold mb-4">登録済みアラート</h2>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-20"></div>
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
          <div className="space-y-2">
            {targets.map((target, index) => (
              <div
                key={target.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => handleEdit(target)}
                className={`card hover:border-brand-accent/50 transition-all cursor-pointer ${
                  draggedIndex === index ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-3 py-1.5 px-4">
                  {/* Drag Handle */}
                  <div className="text-foreground-muted hover:text-foreground transition-colors">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Symbol & Name & Price Data */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-0.5">
                      <span className="text-lg font-bold">{target.symbol}</span>
                      {target.name && (
                        <span className="text-sm text-foreground-muted truncate">
                          {target.name}
                        </span>
                      )}
                    </div>
                    {/* Price Data */}
                    {priceData[target.id] && (
                      <div className="flex items-center gap-3 text-sm">
                        {priceData[target.id].current_price !== null && (
                          <div className="font-semibold">
                            ${priceData[target.id].current_price!.toFixed(2)}
                          </div>
                        )}
                        {priceData[target.id].day_change !== null && (
                          <div className={`flex items-center gap-1 ${
                            priceData[target.id].day_change! > 0
                              ? "text-green-500"
                              : priceData[target.id].day_change! < 0
                              ? "text-red-500"
                              : "text-foreground-muted"
                          }`}>
                            <span>前日比:</span>
                            <span className="font-semibold">
                              {priceData[target.id].day_change! > 0 ? "+" : ""}
                              {priceData[target.id].day_change!.toFixed(2)}%
                            </span>
                          </div>
                        )}
                        {priceData[target.id].month_change !== null && (
                          <div className={`flex items-center gap-1 ${
                            priceData[target.id].month_change! > 0
                              ? "text-green-500"
                              : priceData[target.id].month_change! < 0
                              ? "text-red-500"
                              : "text-foreground-muted"
                          }`}>
                            <span>前月比:</span>
                            <span className="font-semibold">
                              {priceData[target.id].month_change! > 0 ? "+" : ""}
                              {priceData[target.id].month_change!.toFixed(2)}%
                            </span>
                          </div>
                        )}
                        {priceData[target.id].year_change !== null && (
                          <div className={`flex items-center gap-1 ${
                            priceData[target.id].year_change! > 0
                              ? "text-green-500"
                              : priceData[target.id].year_change! < 0
                              ? "text-red-500"
                              : "text-foreground-muted"
                          }`}>
                            <span>前年比:</span>
                            <span className="font-semibold">
                              {priceData[target.id].year_change! > 0 ? "+" : ""}
                              {priceData[target.id].year_change!.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Alert Conditions (Right side) */}
                  <div className="space-y-1">
                    {/* Primary condition */}
                    <div className="flex items-center gap-3 text-sm">
                      {/* 演算子の列 (空白でスペースを確保) */}
                      <div className="w-8"></div>
                      {/* 条件の列 */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-foreground-muted">間隔:</span>
                          <span className="font-semibold">
                            {target.interval_minutes >= 1440
                              ? `${Math.floor(target.interval_minutes / 1440)}日`
                              : target.interval_minutes >= 60
                              ? `${Math.floor(target.interval_minutes / 60)}時間`
                              : `${target.interval_minutes}分`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-foreground-muted">閾値:</span>
                          <span className="font-semibold text-brand-accent">
                            {target.threshold_percent}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-foreground-muted">方向:</span>
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

                    {/* Additional conditions if any */}
                    {target.conditions && target.conditions.length > 1 && (
                      <>
                        {target.conditions.slice(1).map((condition, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-sm">
                            {/* 演算子の列 (固定幅・中央寄せ) */}
                            <div className="w-8 text-center">
                              {condition.operator && (
                                <span className={`text-xs font-bold ${
                                  condition.operator === "OR"
                                    ? "text-brand-accent"
                                    : "text-green-500"
                                }`}>
                                  {condition.operator}
                                </span>
                              )}
                            </div>
                            {/* 条件の列 */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <span className="text-foreground-muted">間隔:</span>
                                <span className="font-semibold">
                                  {condition.interval_minutes >= 1440
                                  ? `${Math.floor(condition.interval_minutes / 1440)}日`
                                  : condition.interval_minutes >= 60
                                  ? `${Math.floor(condition.interval_minutes / 60)}時間`
                                  : `${condition.interval_minutes}分`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-foreground-muted">閾値:</span>
                                <span className="font-semibold text-brand-accent">
                                  {condition.threshold_percent}%
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-foreground-muted">方向:</span>
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
                  </div>

                  {/* Active Toggle and Delete - Horizontal */}
                  <div className="flex items-center gap-2">
                    {/* Active Toggle */}
                    <label
                      className="relative inline-flex items-center cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={target.is_active}
                        onChange={(e) =>
                          handleToggleActive(target.id, e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-background-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
                      <span className="ml-2 text-xs text-foreground-muted whitespace-nowrap">
                        {target.is_active ? "ON" : "OFF"}
                      </span>
                    </label>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(target.id);
                      }}
                      className="h-6 w-6 flex items-center justify-center rounded bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background-primary rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border">
            {/* Modal Header */}
            <div className="sticky top-0 bg-background-primary border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">アラート編集: {editingTarget.symbol}</h2>
              <button
                onClick={handleCloseEdit}
                className="text-foreground-muted hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">

              {/* Conditions */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  監視条件
                </label>
                <div className="space-y-4">
                  {editConditions.map((condition, conditionIndex) => (
                    <div key={conditionIndex}>
                      {/* Operator Display */}
                      {conditionIndex > 0 && condition.operator && (
                        <div className="mb-2 flex items-center gap-2">
                          <div className="h-px flex-1 bg-border"></div>
                          <span
                            className={`px-4 py-2 ${
                              condition.operator === "OR"
                                ? "bg-brand-accent/20 text-brand-accent"
                                : "bg-background-tertiary text-foreground-muted"
                            } font-bold rounded-lg text-sm`}
                          >
                            {condition.operator === "OR"
                              ? "OR（いずれか）"
                              : "AND（かつ）"}
                          </span>
                          <div className="h-px flex-1 bg-border"></div>
                        </div>
                      )}

                      {/* Condition Settings */}
                      <div className="bg-background-secondary rounded-lg p-4 flex items-center gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Interval */}
                          <div>
                            <label className="block text-xs font-medium mb-2">
                              チェック間隔
                            </label>
                            <select
                              className="input w-full"
                              value={condition.interval_minutes}
                              onChange={(e) =>
                                handleUpdateEditCondition(
                                  conditionIndex,
                                  "interval_minutes",
                                  parseInt(e.target.value)
                                )
                              }
                            >
                              {INTERVAL_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Threshold */}
                          <div>
                            <label className="block text-xs font-medium mb-2">
                              アラート閾値 (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="input w-full"
                              value={condition.threshold_percent}
                              onChange={(e) =>
                                handleUpdateEditCondition(
                                  conditionIndex,
                                  "threshold_percent",
                                  parseFloat(e.target.value)
                                )
                              }
                            />
                          </div>

                          {/* Direction */}
                          <div>
                            <label className="block text-xs font-medium mb-2">
                              変動方向
                            </label>
                            <select
                              className="input w-full"
                              value={condition.direction || "both"}
                              onChange={(e) =>
                                handleUpdateEditCondition(
                                  conditionIndex,
                                  "direction",
                                  e.target.value as ChangeDirection
                                )
                              }
                            >
                              <option value="both">↕ 両方向</option>
                              <option value="increase">↑ 上昇のみ</option>
                              <option value="decrease">↓ 下落のみ</option>
                            </select>
                          </div>
                        </div>

                        {/* Delete Button */}
                        {editConditions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditCondition(conditionIndex)}
                            className="btn btn-danger"
                            title="この条件を削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add Condition Buttons */}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddEditCondition("AND")}
                      className="px-3 py-1.5 text-sm rounded-lg bg-background-tertiary hover:bg-foreground/10 text-foreground transition-all duration-200 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      AND条件を追加
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddEditCondition("OR")}
                      className="px-3 py-1.5 text-sm rounded-lg bg-background-tertiary hover:bg-foreground/10 text-foreground transition-all duration-200 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      OR条件を追加（新グループ）
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-background-primary border-t border-border px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseEdit}
                className="btn btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="btn btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="spinner"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    変更を保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
