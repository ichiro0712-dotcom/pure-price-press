import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // デフォルトのstaleTime: 5分
      staleTime: 5 * 60 * 1000,
      // デフォルトのgcTime: 30分
      gcTime: 30 * 60 * 1000,
      // ウィンドウフォーカス時の再取得を無効化（ユーザー要望: 開いた時のデータでいい）
      refetchOnWindowFocus: false,
      // マウント時の再取得を無効化
      refetchOnMount: false,
      // 再接続時の再取得を無効化
      refetchOnReconnect: false,
      // リトライ回数
      retry: 1,
    },
  },
});

// キャッシュキー定数
export const queryKeys = {
  targets: ["targets"] as const,
  target: (id: number) => ["targets", id] as const,
  targetPrice: (id: number) => ["targets", id, "price"] as const,
  alertsBase: ["alerts"] as const,
  alerts: (params?: { limit?: number; symbol?: string; days?: number }) =>
    ["alerts", "list", params ?? {}] as const,
  alertsNew: (since?: string) => ["alerts", "new", since] as const,
  alert: (id: number) => ["alerts", id] as const,
  stats: ["dashboard", "stats"] as const,
  categories: ["categories"] as const,
  config: ["config"] as const,
  news: ["news"] as const,
};
