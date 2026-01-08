import { useQuery, useQueries } from "@tanstack/react-query";
import { monitorTargetsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { MonitorTarget, TargetPriceData } from "@/lib/types";

// 単一ターゲットの価格データ取得
export function usePriceData(targetId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.targetPrice(targetId),
    queryFn: () => monitorTargetsApi.getPrice(targetId),
    staleTime: 1 * 60 * 1000, // 1分
    gcTime: 5 * 60 * 1000, // 5分
    enabled: enabled && targetId > 0,
    retry: 1,
  });
}

// 複数ターゲットの価格データを一括取得（バッチ処理）
export function usePriceDataBatch(targets: MonitorTarget[], enabled = true) {
  const queries = useQueries({
    queries: targets.map((target) => ({
      queryKey: queryKeys.targetPrice(target.id),
      queryFn: () => monitorTargetsApi.getPrice(target.id),
      staleTime: 1 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      enabled: enabled,
      retry: 1,
    })),
  });

  // 結果をRecord<number, TargetPriceData>形式に変換
  const priceData: Record<number, TargetPriceData> = {};
  queries.forEach((query, index) => {
    if (query.data) {
      priceData[targets[index].id] = query.data;
    }
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  return {
    priceData,
    isLoading,
    isError,
    queries,
  };
}
