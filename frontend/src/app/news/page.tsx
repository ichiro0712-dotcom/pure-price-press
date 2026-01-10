"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useNews, useRunNewsBatch } from "@/hooks/useNews";
import NewsCard from "@/components/NewsCard";
import Skeleton from "@/components/Skeleton";
import { ArrowLeft, Newspaper, RefreshCw, Filter, Play } from "lucide-react";
import Link from "next/link";
import type { CuratedNews } from "@/lib/types";

export default function NewsPage() {
  const router = useRouter();
  const [minScore, setMinScore] = useState<number>(0);
  const { data: newsData, isLoading, refetch, isFetching } = useNews({
    limit: 50,
    min_score: minScore,
  });
  const runBatch = useRunNewsBatch();

  const handleRunBatch = async () => {
    if (confirm("ニュースバッチ処理を実行しますか？（数分かかることがあります）")) {
      try {
        await runBatch.mutateAsync(24);
        refetch();
      } catch (error) {
        console.error("Batch run failed:", error);
        alert("バッチ処理に失敗しました");
      }
    }
  };

  const scoreFilters = [
    { label: "すべて", value: 0 },
    { label: "参考以上", value: 4 },
    { label: "重要以上", value: 6 },
    { label: "必見のみ", value: 8 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">ニュース</h1>
          <p className="text-sm text-gray-400">
            AI分析による重要ニュース一覧
          </p>
        </div>
        <button
          onClick={handleRunBatch}
          disabled={runBatch.isPending}
          className="btn btn-secondary flex items-center gap-2 text-sm"
        >
          <Play className={`w-4 h-4 ${runBatch.isPending ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">
            {runBatch.isPending ? "処理中..." : "バッチ実行"}
          </span>
        </button>
      </div>

      {/* Digest Info */}
      {newsData?.digest && (
        <div className="card p-4 bg-brand-accent/10 border-brand-accent/30">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-gray-400">最終更新: </span>
              <span className="font-semibold">
                {new Date(newsData.digest.created_at).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div>
              <span className="text-gray-400">収集: </span>
              <span className="font-semibold">{newsData.digest.total_raw_news}件</span>
            </div>
            <div>
              <span className="text-gray-400">→ 厳選: </span>
              <span className="font-semibold text-brand-accent">
                {newsData.digest.total_curated_news}件
              </span>
            </div>
            {newsData.digest.processing_time_seconds && (
              <div>
                <span className="text-gray-400">処理時間: </span>
                <span className="font-semibold">
                  {newsData.digest.processing_time_seconds.toFixed(1)}秒
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-2">
          {scoreFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setMinScore(filter.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${minScore === filter.value
                  ? "bg-brand-accent text-black font-semibold"
                  : "bg-gray-900 hover:bg-gray-800"
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto btn btn-secondary flex items-center gap-1 text-sm px-3 py-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">更新</span>
        </button>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-400">
        {newsData?.total_count || 0}件のニュース
        {minScore > 0 && ` (スコア${minScore}以上)`}
      </div>

      {/* News List */}
      {isLoading ? (
        <Skeleton variant="card" count={10} />
      ) : newsData && newsData.news.length > 0 ? (
        <div className="space-y-3">
          {newsData.news.map((news) => (
            <NewsCard
              key={news.id}
              news={news}
              onClick={(n: CuratedNews) => router.push(`/news/${n.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Newspaper className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            ニュースがありません
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {minScore > 0
              ? `スコア${minScore}以上のニュースはありません`
              : "バッチ処理を実行してニュースを収集してください"}
          </p>
          {minScore === 0 && (
            <button
              onClick={handleRunBatch}
              disabled={runBatch.isPending}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Play className={`w-4 h-4 ${runBatch.isPending ? "animate-spin" : ""}`} />
              {runBatch.isPending ? "処理中..." : "バッチ処理を実行"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
