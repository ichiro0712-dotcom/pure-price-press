import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";

// ダッシュボード統計取得
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => dashboardApi.getStats(),
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 30 * 60 * 1000, // 30分
  });
}
