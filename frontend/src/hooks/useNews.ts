/**
 * React Query hooks for News feature
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { newsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { NewsListResponse, CuratedNews, DailyDigest, NewsBatchRunResponse } from "@/lib/types";

/**
 * Hook to fetch curated news list
 */
export function useNews(params?: {
  limit?: number;
  offset?: number;
  min_score?: number;
}) {
  return useQuery<NewsListResponse>({
    queryKey: [...queryKeys.news, params],
    queryFn: () => newsApi.getNews(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch a single news item
 */
export function useNewsDetail(id: number) {
  return useQuery<CuratedNews>({
    queryKey: [...queryKeys.news, "detail", id],
    queryFn: () => newsApi.getById(id),
    enabled: id > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch latest digest
 */
export function useLatestDigest() {
  return useQuery<DailyDigest>({
    queryKey: [...queryKeys.news, "digest", "latest"],
    queryFn: () => newsApi.getLatestDigest(),
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry if no digest exists
  });
}

/**
 * Hook to fetch digest history
 */
export function useDigestHistory(limit?: number) {
  return useQuery<DailyDigest[]>({
    queryKey: [...queryKeys.news, "digest", "history", limit],
    queryFn: () => newsApi.getDigestHistory(limit),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to run news batch manually
 */
export function useRunNewsBatch() {
  const queryClient = useQueryClient();

  return useMutation<NewsBatchRunResponse, Error, number | undefined>({
    mutationFn: (hoursBack) => newsApi.runBatch(hoursBack),
    onSuccess: () => {
      // Invalidate news queries after successful batch run
      queryClient.invalidateQueries({ queryKey: queryKeys.news });
    },
  });
}
