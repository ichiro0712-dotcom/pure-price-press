import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";

// アラート一覧取得
export function useAlerts(params?: { limit?: number; symbol?: string; days?: number }) {
  const { limit = 50, symbol, days } = params ?? {};
  return useQuery({
    queryKey: queryKeys.alerts({ limit, symbol, days }),
    queryFn: () => alertsApi.getAll({ limit, symbol, days }),
    staleTime: 1 * 60 * 1000, // 1分
    gcTime: 10 * 60 * 1000, // 10分
  });
}

// 単一アラート取得
export function useAlert(id: number) {
  return useQuery({
    queryKey: queryKeys.alert(id),
    queryFn: () => alertsApi.getById(id),
    enabled: id > 0,
  });
}

// 新規アラートチェック（Service Workerから呼ばれる用途）
export function useCheckNewAlerts(since?: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.alertsNew(since),
    queryFn: () => alertsApi.checkNew(since),
    enabled,
    staleTime: 0, // 常に新鮮なデータを取得
  });
}

// アラート削除
export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => alertsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertsBase });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}
