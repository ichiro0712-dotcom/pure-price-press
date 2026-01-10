"use client";

import React from "react";
import type { CuratedNews } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Clock,
  Tag,
  Layers,
} from "lucide-react";

interface NewsCardProps {
  news: CuratedNews;
  compact?: boolean;
  onClick?: (news: CuratedNews) => void;
}

export default function NewsCard({ news, compact = false, onClick }: NewsCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-red-500 bg-red-500/20";
    if (score >= 6) return "text-yellow-500 bg-yellow-500/20";
    if (score >= 4) return "text-blue-500 bg-blue-500/20";
    return "text-gray-400 bg-white/10";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "必見";
    if (score >= 6) return "重要";
    if (score >= 4) return "参考";
    return "低";
  };

  const getImpactIcon = (direction: string | null | undefined) => {
    if (direction === "positive") {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    }
    if (direction === "negative") {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  const getRegionLabel = (region: string) => {
    const labels: Record<string, string> = {
      north_america: "北米",
      europe: "欧州",
      asia: "アジア",
      japan: "日本",
      middle_east: "中東",
      institutions: "国際機関",
    };
    return labels[region] || region;
  };

  const getImpactBadge = (direction: string | null | undefined) => {
    if (!direction || direction === "uncertain") return null;

    const config = {
      positive: { bg: "bg-green-500/20", text: "text-green-500", label: "上昇" },
      negative: { bg: "bg-red-500/20", text: "text-red-500", label: "下落" },
      mixed: { bg: "bg-yellow-500/20", text: "text-yellow-500", label: "混合" },
    };

    const c = config[direction as keyof typeof config];
    if (!c) return null;

    return (
      <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${c.bg} ${c.text}`}>
        {getImpactIcon(direction)}
        {c.label}
      </span>
    );
  };

  const formatPublishedDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleString("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(news);
    } else {
      window.open(news.url, "_blank");
    }
  };

  // ソース数バッジ（2以上の場合のみ表示）
  const SourceCountBadge = () => {
    if (!news.source_count || news.source_count <= 1) return null;
    return (
      <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded flex items-center gap-1">
        <Layers className="w-3 h-3" />
        {news.source_count}社
      </span>
    );
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className="card p-3 hover:border-brand-accent/50 transition-all cursor-pointer"
      >
        <div className="flex items-start gap-3">
          {/* Score Badge */}
          <div
            className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold ${getScoreColor(
              news.importance_score
            )}`}
          >
            {news.importance_score.toFixed(1)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium line-clamp-2">{news.title}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-400">
              <span>{news.source}</span>
              <span>•</span>
              <span>{getRegionLabel(news.region)}</span>
              {news.source_count > 1 && (
                <>
                  <span>•</span>
                  <span className="text-purple-400">{news.source_count}社</span>
                </>
              )}
              {getImpactIcon(news.impact_direction)}
            </div>
          </div>

          <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="card p-4 hover:border-brand-accent/50 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Score Badge */}
        <div className="flex-shrink-0 text-center">
          <div
            className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center ${getScoreColor(
              news.importance_score
            )}`}
          >
            <span className="text-lg font-bold">
              {news.importance_score.toFixed(1)}
            </span>
            <span className="text-[10px]">{getScoreLabel(news.importance_score)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base line-clamp-2">{news.title}</h3>
            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
          </div>

          <p className="text-sm text-gray-300 mt-2 line-clamp-2">
            {news.relevance_reason}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* ソース数バッジ */}
            <SourceCountBadge />

            {/* カテゴリー */}
            {news.category && (
              <span className="text-xs px-2 py-0.5 bg-brand-accent/20 text-brand-accent rounded flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {news.category}
              </span>
            )}

            {/* ソース */}
            <span className="text-xs px-2 py-0.5 bg-white/10 rounded">
              {news.source}
            </span>

            {/* 地域 */}
            <span className="text-xs px-2 py-0.5 bg-white/10 rounded">
              {getRegionLabel(news.region)}
            </span>

            {/* 影響方向 */}
            {getImpactBadge(news.impact_direction)}
          </div>

          {/* Affected Symbols with Impact Direction */}
          {news.affected_symbols && news.affected_symbols.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {news.affected_symbols.slice(0, 5).map((symbol) => {
                const symbolImpact = news.symbol_impacts?.[symbol];
                const direction = symbolImpact?.direction;

                // シンボルごとの影響方向に基づく色分け
                let bgColor = "bg-blue-500/20 text-blue-400";
                if (direction === "positive") {
                  bgColor = "bg-green-500/20 text-green-400";
                } else if (direction === "negative") {
                  bgColor = "bg-red-500/20 text-red-400";
                } else if (direction === "mixed") {
                  bgColor = "bg-yellow-500/20 text-yellow-400";
                }

                return (
                  <span
                    key={symbol}
                    className={`text-xs px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5 ${bgColor}`}
                  >
                    {direction === "positive" && <TrendingUp className="w-3 h-3" />}
                    {direction === "negative" && <TrendingDown className="w-3 h-3" />}
                    {symbol}
                  </span>
                );
              })}
              {news.affected_symbols.length > 5 && (
                <span className="text-xs text-gray-400">
                  +{news.affected_symbols.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Timestamp - published_at優先、なければcreated_at */}
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>
              {formatPublishedDate(news.published_at) ||
                new Date(news.created_at).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
