import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";

// 設定一覧取得
export function useConfigs() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: () => configApi.getAll(),
    staleTime: 30 * 60 * 1000, // 30分
    gcTime: 60 * 60 * 1000, // 60分
  });
}

// 設定更新
export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      configApi.set(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config });
    },
  });
}

// 複数設定を一括更新
export function useUpdateConfigs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configs: Record<string, string>) => {
      const promises = Object.entries(configs).map(([key, value]) =>
        configApi.set(key, value)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config });
    },
  });
}
