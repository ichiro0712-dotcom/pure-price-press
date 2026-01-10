'use client';

import { useParams, useRouter } from 'next/navigation';
import { useNewsDetail } from '@/hooks/useNews';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ExternalLink, Clock, Tag, Layers, Globe, FileText, BarChart2, Target, Link2 } from 'lucide-react';

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const newsId = params.id as string;

  const { data: news, isLoading, error } = useNewsDetail(parseInt(newsId));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/4"></div>
            <div className="h-32 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-400">Error</h2>
            <p className="text-gray-300 mt-2">News not found</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-red-400';
    if (score >= 6) return 'text-yellow-400';
    if (score >= 4) return 'text-blue-400';
    return 'text-gray-400';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 8) return { bg: 'bg-red-900/50', border: 'border-red-700', label: '必見' };
    if (score >= 6) return { bg: 'bg-yellow-900/50', border: 'border-yellow-700', label: '重要' };
    if (score >= 4) return { bg: 'bg-blue-900/50', border: 'border-blue-700', label: '参考' };
    return { bg: 'bg-gray-800', border: 'border-gray-700', label: '低優先' };
  };

  const getImpactIcon = (direction: string | null) => {
    switch (direction) {
      case 'positive': return { icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-400', bgColor: 'bg-green-500/20', label: '上昇予想' };
      case 'negative': return { icon: <TrendingDown className="w-5 h-5" />, color: 'text-red-400', bgColor: 'bg-red-500/20', label: '下落予想' };
      case 'mixed': return { icon: <BarChart2 className="w-5 h-5" />, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: '混合' };
      default: return { icon: <BarChart2 className="w-5 h-5" />, color: 'text-gray-400', bgColor: 'bg-gray-500/20', label: '不明' };
    }
  };

  const getRegionLabel = (region: string) => {
    const labels: Record<string, string> = {
      north_america: '北米',
      europe: '欧州',
      asia: 'アジア',
      japan: '日本',
      middle_east: '中東',
      institutions: '国際機関',
    };
    return labels[region] || region;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  const badge = getScoreBadge(news.importance_score);
  const impact = getImpactIcon(news.impact_direction);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <Link href="/news" className="text-gray-400 hover:text-white text-sm">
                News List
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Score & Title Section */}
        <div className="space-y-4">
          {/* Score Badge & Source Count */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`${badge.bg} border ${badge.border} px-4 py-2 rounded-lg flex items-center gap-2`}>
              <span className={`text-2xl font-bold ${getScoreColor(news.importance_score)}`}>
                {news.importance_score.toFixed(1)}
              </span>
              <span className={`text-sm px-2 py-0.5 rounded ${badge.bg} ${badge.border} border`}>
                {badge.label}
              </span>
            </div>

            {/* Source Count Badge */}
            {news.source_count > 1 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-700 rounded-lg">
                <Layers className="w-5 h-5 text-purple-400" />
                <span className="text-purple-400 font-medium">{news.source_count}社が報道</span>
              </div>
            )}

            {/* Category */}
            {news.category && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-700 rounded-lg">
                <Tag className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400">{news.category}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold leading-tight">
            {news.title}
          </h1>

          {/* Meta Info Row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {news.source}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              {getRegionLabel(news.region)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(news.published_at) || formatDate(news.created_at)}
            </span>
          </div>

          {/* Original Article Link */}
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-600 rounded-lg text-yellow-400 hover:bg-yellow-500/30 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            元記事を読む
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* AI Summary Section */}
        {news.ai_summary && (
          <section className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-blue-400">
              <FileText className="w-5 h-5" />
              AI要約
            </h2>
            <p className="text-gray-200 leading-relaxed">
              {news.ai_summary}
            </p>
          </section>
        )}

        {/* Impact Direction & Analysis */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            AI分析
          </h2>

          <div className="space-y-4">
            {/* Impact Direction */}
            <div className="flex items-center gap-3">
              <span className="text-gray-400">インパクト方向:</span>
              <span className={`flex items-center gap-2 px-3 py-1 rounded-lg ${impact.bgColor} ${impact.color}`}>
                {impact.icon}
                {impact.label}
              </span>
            </div>

            {/* Relevance Reason - Why this affects market */}
            {news.relevance_reason && (
              <div>
                <span className="text-gray-400 text-sm">なぜこのニュースが市場に影響を与えるか:</span>
                <p className="mt-2 text-gray-200 leading-relaxed bg-gray-800/50 p-4 rounded-lg">
                  {news.relevance_reason}
                </p>
              </div>
            )}

          </div>
        </section>

        {/* Affected Symbols with Per-Symbol Analysis */}
        {news.affected_symbols && news.affected_symbols.length > 0 && (
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              影響銘柄
            </h2>

            <div className="space-y-3">
              {news.affected_symbols.map((symbol, idx) => {
                const symbolImpact = news.symbol_impacts?.[symbol];
                const direction = symbolImpact?.direction;
                const analysis = symbolImpact?.analysis;

                // Color based on direction
                let borderColor = 'border-gray-700';
                let bgColor = 'bg-gray-800';
                let textColor = 'text-gray-300';
                let icon = null;

                if (direction === 'positive') {
                  borderColor = 'border-green-700';
                  bgColor = 'bg-green-900/30';
                  textColor = 'text-green-400';
                  icon = <TrendingUp className="w-4 h-4 text-green-400" />;
                } else if (direction === 'negative') {
                  borderColor = 'border-red-700';
                  bgColor = 'bg-red-900/30';
                  textColor = 'text-red-400';
                  icon = <TrendingDown className="w-4 h-4 text-red-400" />;
                } else if (direction === 'mixed') {
                  borderColor = 'border-yellow-700';
                  bgColor = 'bg-yellow-900/30';
                  textColor = 'text-yellow-400';
                }

                return (
                  <div
                    key={idx}
                    className={`${bgColor} border ${borderColor} rounded-lg p-4`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`font-mono font-bold text-lg ${textColor}`}>
                        {symbol}
                      </span>
                      {icon}
                      {direction && (
                        <span className={`text-xs px-2 py-0.5 rounded ${bgColor} ${textColor}`}>
                          {direction === 'positive' ? '上昇' : direction === 'negative' ? '下落' : '混合'}
                        </span>
                      )}
                    </div>
                    {analysis && (
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {analysis}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
