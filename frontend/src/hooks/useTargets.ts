import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { monitorTargetsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { MonitorTargetCreate, MonitorTargetUpdate } from "@/lib/types";

// 全ターゲット取得
export function useTargets() {
  return useQuery({
    queryKey: queryKeys.targets,
    queryFn: () => monitorTargetsApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 30 * 60 * 1000, // 30分
  });
}

// 単一ターゲット取得
export function useTarget(id: number) {
  return useQuery({
    queryKey: queryKeys.target(id),
    queryFn: () => monitorTargetsApi.getById(id),
    enabled: id > 0,
  });
}

// ターゲット作成
export function useCreateTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MonitorTargetCreate) => monitorTargetsApi.create(data),
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.targets });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// ターゲット更新
export function useUpdateTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MonitorTargetUpdate }) =>
      monitorTargetsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// ターゲット削除
export function useDeleteTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => monitorTargetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// ターゲット並び替え
export function useReorderTargets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetIds: number[]) => monitorTargetsApi.reorder(targetIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets });
    },
  });
}

// カテゴリー取得
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => monitorTargetsApi.getCategories(),
    staleTime: 30 * 60 * 1000, // 30分
    gcTime: 60 * 60 * 1000, // 60分
  });
}
