"use client";

import React, { useState } from "react";
import { useTargets, useCategories, useCreateTarget, useUpdateTarget, useDeleteTarget, useReorderTargets } from "@/hooks/useTargets";
import { usePriceDataBatch } from "@/hooks/usePriceData";
import type { MonitorTarget, MonitorTargetCreate, MonitorCondition, ConditionOperator, ChangeDirection } from "@/lib/types";
import TargetListItem from "@/components/TargetListItem";
import Skeleton from "@/components/Skeleton";
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
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function TargetsPage() {
  // React Query hooks
  const { data: targets = [], isLoading: targetsLoading } = useTargets();
  const { data: categories = [] } = useCategories();
  const { priceData } = usePriceDataBatch(targets, targets.length > 0);

  // Mutations
  const createTarget = useCreateTarget();
  const updateTarget = useUpdateTarget();
  const deleteTarget = useDeleteTarget();
  const reorderTargets = useReorderTargets();

  // Local UI state
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedTarget, setDraggedTarget] = useState<MonitorTarget | null>(null);
  const [localTargets, setLocalTargets] = useState<MonitorTarget[] | null>(null);
  const [editingTarget, setEditingTarget] = useState<MonitorTarget | null>(null);
  const [editConditions, setEditConditions] = useState<MonitorCondition[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Form state for new target
  const [newTarget, setNewTarget] = useState<MonitorTargetCreate>({
    symbol: "",
    name: "",
    category: "",
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

  // Use local targets during drag, otherwise use query data
  const displayTargets = localTargets ?? targets;

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();

    createTarget.mutate(
      { ...newTarget, conditions },
      {
        onSuccess: () => {
          showMessage("success", `${newTarget.symbol} を追加しました`);
          // Reset form
          setNewTarget({
            symbol: "",
            name: "",
            category: "",
            is_active: true,
          });
          setConditions([
            {
              interval_minutes: DEFAULT_INTERVAL,
              threshold_percent: DEFAULT_THRESHOLD,
              direction: "both",
            },
          ]);
        },
        onError: (error: any) => {
          showMessage(
            "error",
            error.detail || "銘柄の追加に失敗しました。もう一度お試しください。"
          );
        },
      }
    );
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

  // カテゴリー別にグループ化
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

  // カテゴリーの折りたたみトグル
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

  const handleToggleActive = async (id: number, isActive: boolean) => {
    updateTarget.mutate(
      { id, data: { is_active: isActive } },
      {
        onError: () => showMessage("error", "銘柄の更新に失敗しました"),
      }
    );
  };

  const handleDelete = async (id: number) => {
    deleteTarget.mutate(id, {
      onSuccess: () => showMessage("success", "銘柄を削除しました"),
      onError: () => showMessage("error", "銘柄の削除に失敗しました"),
    });
  };

  // ドラッグ&ドロップハンドラー
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    setDraggedTarget(targets[index]);
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

  // カテゴリーヘッダーへのドロップ
  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCategoryDrop = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    if (!draggedTarget) return;

    // 未分類の場合はnullに変換
    const newCategory = targetCategory === "未分類" ? null : targetCategory;
    const currentCategory = draggedTarget.category || null;

    // カテゴリーが変わった場合のみ更新
    if (newCategory !== currentCategory) {
      updateTarget.mutate(
        { id: draggedTarget.id, data: { category: newCategory || undefined } },
        {
          onSuccess: () => {
            showMessage("success", `${draggedTarget.symbol} を「${targetCategory}」に移動しました`);
          },
          onError: () => showMessage("error", "カテゴリーの変更に失敗しました"),
        }
      );
    }

    setDraggedIndex(null);
    setDraggedTarget(null);
    setLocalTargets(null);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null && localTargets && draggedTarget) {
      // カテゴリーが変更されていない場合は並び順を更新
      const targetIds = localTargets.map((t) => t.id);
      reorderTargets.mutate(targetIds);
    }
    setDraggedIndex(null);
    setDraggedTarget(null);
    setLocalTargets(null);
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

    // 条件の準備：最初の条件のoperatorは常にnullにする
    const preparedConditions = editConditions.map((cond, index) => ({
      ...cond,
      operator: index === 0 ? null : cond.operator,
    }));

    updateTarget.mutate(
      {
        id: editingTarget.id,
        data: {
          name: editingTarget.name || undefined,
          category: editingTarget.category || undefined,
          interval_minutes: preparedConditions[0].interval_minutes,
          threshold_percent: preparedConditions[0].threshold_percent,
          direction: preparedConditions[0].direction,
          conditions: preparedConditions.length > 0 ? preparedConditions : undefined,
          is_active: editingTarget.is_active,
        },
      },
      {
        onSuccess: () => {
          showMessage("success", "銘柄を更新しました");
          handleCloseEdit();
        },
        onError: () => showMessage("error", "銘柄の更新に失敗しました"),
      }
    );
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

  const saving = createTarget.isPending || updateTarget.isPending;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">アラート登録</h1>
        <p className="text-sm sm:text-base text-foreground-muted">
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
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-accent/20 rounded-lg flex items-center justify-center">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-brand-accent" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">新規アラートを追加</h2>
            <p className="text-xs sm:text-sm text-foreground-muted">
              価格変動を監視する銘柄を追加
            </p>
          </div>
        </div>

        <form onSubmit={handleAddTarget} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Symbol */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                シンボル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input text-sm sm:text-base"
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
              <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
                株式ティッカーシンボル
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                名前（任意）
              </label>
              <input
                type="text"
                className="input text-sm sm:text-base"
                placeholder="例: Apple Inc."
                value={newTarget.name}
                onChange={(e) =>
                  setNewTarget({ ...newTarget, name: e.target.value })
                }
              />
              <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
                銘柄の表示名
              </p>
            </div>

            {/* Category */}
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                カテゴリー（任意）
              </label>
              <input
                type="text"
                className="input text-sm sm:text-base"
                placeholder="例: 地政学・エネルギー"
                list="category-list"
                value={newTarget.category || ""}
                onChange={(e) =>
                  setNewTarget({ ...newTarget, category: e.target.value })
                }
              />
              <datalist id="category-list">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
                銘柄をグループ化するカテゴリー（既存のカテゴリーから選択または新規入力）
              </p>
            </div>

          </div>

          {/* 監視条件 */}
          <div className="border-t border-foreground/10 pt-4 sm:pt-6">
            <div className="mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold">監視条件</h3>
              <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
                条件を追加し、AND／ORで組み合わせます
              </p>
            </div>

            {/* グループ表示 */}
            <div className="space-y-3 sm:space-y-4">
              {getConditionGroups().map((group, groupIndex) => (
                <div key={groupIndex}>
                  {/* グループの枠 */}
                  <div className="border-2 border-brand-accent/30 rounded-lg p-3 sm:p-4 bg-brand-accent/5">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-brand-accent/20 text-brand-accent">
                        グループ {groupIndex + 1}
                      </span>
                      {group.length > 1 && (
                        <span className="text-[10px] sm:text-xs text-foreground-muted hidden sm:inline">
                          （すべての条件を満たす）
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      {group.map((condition) => {
                        const conditionIndex = conditions.indexOf(condition);
                        return (
                          <div key={conditionIndex}>
                            {/* AND/ORセレクター（最初の条件以外） */}
                            {conditionIndex > 0 && (
                              <div className="flex items-center gap-2 mb-2">
                                <select
                                  className="input w-24 sm:w-32 text-xs sm:text-sm py-1"
                                  value={condition.operator || "AND"}
                                  onChange={(e) =>
                                    handleUpdateCondition(
                                      conditionIndex,
                                      "operator",
                                      e.target.value as ConditionOperator
                                    )
                                  }
                                >
                                  <option value="AND">AND</option>
                                  <option value="OR">OR</option>
                                </select>
                                <span className="text-[10px] sm:text-xs text-foreground-muted hidden sm:inline">
                                  {condition.operator === "OR"
                                    ? "→ 新グループ"
                                    : "→ 同グループ"}
                                </span>
                              </div>
                            )}

                            {/* 条件の設定 */}
                            <div className="bg-background-secondary rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                              <div className="flex-1 w-full grid grid-cols-3 gap-2 sm:gap-4">
                                {/* Interval */}
                                <div>
                                  <label className="block text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                                    間隔
                                  </label>
                                  <select
                                    className="input w-full text-xs sm:text-sm py-1.5 sm:py-2"
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
                                  <label className="block text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                                    閾値（%）
                                  </label>
                                  <input
                                    type="number"
                                    className="input w-full text-xs sm:text-sm py-1.5 sm:py-2"
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
                                  <label className="block text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                                    方向
                                  </label>
                                  <select
                                    className="input w-full text-xs sm:text-sm py-1.5 sm:py-2"
                                    value={condition.direction || "both"}
                                    onChange={(e) =>
                                      handleUpdateCondition(
                                        conditionIndex,
                                        "direction",
                                        e.target.value as ChangeDirection
                                      )
                                    }
                                  >
                                    <option value="both">↕</option>
                                    <option value="increase">↑</option>
                                    <option value="decrease">↓</option>
                                  </select>
                                </div>
                              </div>

                              {/* Delete Button */}
                              {conditions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCondition(conditionIndex)}
                                  className="btn btn-danger p-2 sm:p-2.5 self-end sm:self-auto"
                                  title="削除"
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                    <div className="flex items-center justify-center my-2 sm:my-3">
                      <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-brand-accent/20 text-brand-accent font-bold rounded-lg text-xs sm:text-sm">
                        OR
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* 条件を追加ボタン */}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleAddCondition("AND")}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-background-tertiary hover:bg-foreground/10 text-foreground transition-all duration-200 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  AND追加
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCondition("OR")}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-background-tertiary hover:bg-foreground/10 text-foreground transition-all duration-200 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  OR追加
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

      {/* Existing Targets - Category View */}
      <div>
        <h2 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4">登録済みアラート</h2>

        {targetsLoading ? (
          <Skeleton variant="card" count={5} />
        ) : displayTargets.length === 0 ? (
          <div className="card text-center py-8 sm:py-12 px-4">
            <p className="text-sm sm:text-base text-foreground-muted">
              まだ銘柄がありません。上のフォームから最初の銘柄を追加してください
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(getTargetsByCategory()).map(([category, categoryTargets]) => (
              <div
                key={category}
                className="border border-foreground/10 rounded-lg overflow-hidden"
              >
                {/* Category Header - Droppable Area */}
                <button
                  onClick={() => toggleCategory(category)}
                  onDragOver={handleCategoryDragOver}
                  onDrop={(e) => handleCategoryDrop(e, category)}
                  className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-background-secondary hover:bg-background-tertiary transition-colors ${
                    draggedTarget && draggedTarget.category !== (category === "未分類" ? null : category)
                      ? "ring-2 ring-brand-accent ring-inset"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {collapsedCategories.has(category) ? (
                      <ChevronRight className="w-4 h-4 text-foreground-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-foreground-muted" />
                    )}
                    <span className="text-sm font-semibold">{category}</span>
                    <span className="text-xs text-foreground-muted bg-background-tertiary px-2 py-0.5 rounded-full">
                      {categoryTargets.length}
                    </span>
                  </div>
                  {draggedTarget && (
                    <span className="text-xs text-brand-accent">
                      ここにドロップ
                    </span>
                  )}
                </button>

                {/* Category Items */}
                {!collapsedCategories.has(category) && (
                  <div className="divide-y divide-foreground/5">
                    {categoryTargets.map((target) => {
                      const globalIndex = displayTargets.findIndex((t) => t.id === target.id);
                      return (
                        <TargetListItem
                          key={target.id}
                          target={target}
                          index={globalIndex}
                          priceData={priceData[target.id] || null}
                          isDragging={draggedIndex === globalIndex}
                          showDragHandle={true}
                          showToggle={true}
                          showDelete={true}
                          showConditions={true}
                          showYahooLink={false}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDragEnd={handleDragEnd}
                          onToggleActive={handleToggleActive}
                          onDelete={handleDelete}
                          onClick={handleEdit}
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

      {/* Edit Modal */}
      {editingTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-background-primary rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-3xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto border border-border">
            {/* Modal Header */}
            <div className="sticky top-0 bg-background-primary border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h2 className="text-lg sm:text-2xl font-bold">編集: {editingTarget.symbol}</h2>
              <button
                onClick={handleCloseEdit}
                className="text-foreground-muted hover:text-foreground transition-colors p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

              {/* Name and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                    名前（任意）
                  </label>
                  <input
                    type="text"
                    className="input w-full text-sm sm:text-base"
                    placeholder="例: Apple Inc."
                    value={editingTarget.name || ""}
                    onChange={(e) =>
                      setEditingTarget({ ...editingTarget, name: e.target.value || null })
                    }
                  />
                  <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
                    銘柄の表示名
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                    カテゴリー（任意）
                  </label>
                  <input
                    type="text"
                    className="input w-full text-sm sm:text-base"
                    placeholder="例: 地政学・エネルギー"
                    list="edit-category-list"
                    value={editingTarget.category || ""}
                    onChange={(e) =>
                      setEditingTarget({ ...editingTarget, category: e.target.value || null })
                    }
                  />
                  <datalist id="edit-category-list">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
                    銘柄をグループ化するカテゴリー
                  </p>
                </div>
              </div>

              {/* Conditions */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                  監視条件
                </label>
                <div className="space-y-3 sm:space-y-4">
                  {editConditions.map((condition, conditionIndex) => (
                    <div key={conditionIndex}>
                      {/* Operator Display */}
                      {conditionIndex > 0 && condition.operator && (
                        <div className="mb-2 flex items-center gap-2">
                          <div className="h-px flex-1 bg-border"></div>
                          <span
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 ${
                              condition.operator === "OR"
                                ? "bg-brand-accent/20 text-brand-accent"
                                : "bg-background-tertiary text-foreground-muted"
                            } font-bold rounded-lg text-xs sm:text-sm`}
                          >
                            {condition.operator === "OR" ? "OR" : "AND"}
                          </span>
                          <div className="h-px flex-1 bg-border"></div>
                        </div>
                      )}

                      {/* Condition Settings */}
                      <div className="bg-background-secondary rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <div className="flex-1 w-full grid grid-cols-3 gap-2 sm:gap-4">
                          {/* Interval */}
                          <div>
                            <label className="block text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                              間隔
                            </label>
                            <select
                              className="input w-full text-xs sm:text-sm py-1.5 sm:py-2"
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
                            <label className="block text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                              閾値（%）
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="input w-full text-xs sm:text-sm py-1.5 sm:py-2"
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
                            <label className="block text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                              方向
                            </label>
                            <select
                              className="input w-full text-xs sm:text-sm py-1.5 sm:py-2"
                              value={condition.direction || "both"}
                              onChange={(e) =>
                                handleUpdateEditCondition(
                                  conditionIndex,
                                  "direction",
                                  e.target.value as ChangeDirection
                                )
                              }
                            >
                              <option value="both">↕</option>
                              <option value="increase">↑</option>
                              <option value="decrease">↓</option>
                            </select>
                          </div>
                        </div>

                        {/* Delete Button */}
                        {editConditions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditCondition(conditionIndex)}
                            className="btn btn-danger p-2 sm:p-2.5 self-end sm:self-auto"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add Condition Buttons */}
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddEditCondition("AND")}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-background-tertiary hover:bg-foreground/10 text-foreground transition-all duration-200 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      AND追加
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddEditCondition("OR")}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-background-tertiary hover:bg-foreground/10 text-foreground transition-all duration-200 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      OR追加
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-background-primary border-t border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-end gap-2 sm:gap-3">
              <button
                onClick={handleCloseEdit}
                className="btn btn-secondary text-sm px-3 sm:px-4 py-1.5 sm:py-2"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="btn btn-primary flex items-center gap-1.5 sm:gap-2 text-sm px-3 sm:px-4 py-1.5 sm:py-2"
              >
                {saving ? (
                  <>
                    <div className="spinner w-3.5 h-3.5 sm:w-4 sm:h-4"></div>
                    <span className="hidden sm:inline">保存中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>保存</span>
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
