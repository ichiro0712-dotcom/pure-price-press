"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cpu,
  Newspaper,
  TrendingUp,
  BarChart3,
  Link2,
  ChevronDown,
  ChevronUp,
  Zap,
  Filter,
  Scale,
  GitBranch,
  Globe,
} from "lucide-react";

interface LogicSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: React.ReactNode;
}

export default function LogicPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["news-collection"])
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const logicSections: LogicSection[] = [
    {
      id: "news-collection",
      title: "ニュース収集ロジック",
      icon: <Newspaper className="w-5 h-5" />,
      description: "複数ソースからニュースを収集し、地域バランスを調整",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              地域バランス設定
            </h4>
            <div className="bg-gray-800 p-3 rounded-lg text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span>北米 (north_america)</span>
                <span className="text-brand-accent">32%</span>
              </div>
              <div className="flex justify-between">
                <span>欧州 (europe)</span>
                <span className="text-brand-accent">20%</span>
              </div>
              <div className="flex justify-between">
                <span>アジア (asia)</span>
                <span className="text-brand-accent">20%</span>
              </div>
              <div className="flex justify-between">
                <span>日本 (japan)</span>
                <span className="text-brand-accent">20%</span>
              </div>
              <div className="flex justify-between">
                <span>中東 (middle_east)</span>
                <span className="text-brand-accent">4%</span>
              </div>
              <div className="flex justify-between">
                <span>国際機関 (institutions)</span>
                <span className="text-brand-accent">4%</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-green-500" />
              ニュースソース
            </h4>
            <div className="grid gap-2">
              {[
                { name: "Alpha Vantage News API", region: "北米", type: "API" },
                { name: "Finnhub News API", region: "北米", type: "API" },
                { name: "Google News RSS (Business)", region: "北米", type: "RSS" },
                { name: "Google News RSS (Tech)", region: "北米", type: "RSS" },
                { name: "日経新聞", region: "日本", type: "RSS" },
                { name: "Bloomberg Japan", region: "日本", type: "RSS" },
                { name: "Reuters Japan", region: "日本", type: "RSS" },
                { name: "Nikkei Asia RSS", region: "アジア", type: "RSS" },
                { name: "SCMP RSS", region: "アジア", type: "RSS" },
                { name: "Financial Times RSS", region: "欧州", type: "RSS" },
                { name: "MarketWatch RSS", region: "北米", type: "RSS" },
              ].map((source) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between p-2 bg-gray-800 rounded text-xs"
                >
                  <span>{source.name}</span>
                  <div className="flex gap-2">
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-500 rounded">
                      {source.region}
                    </span>
                    <span className="px-1.5 py-0.5 bg-white/10 rounded">
                      {source.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-500" />
              重複排除ロジック
            </h4>
            <div className="bg-gray-800 p-3 rounded-lg text-xs space-y-2">
              <p>• タイトルの類似度チェック（閾値: 85%）</p>
              <p>• 同一URLの記事は自動マージ</p>
              <p>• 複数ソースで報道された記事は重要度ブースト</p>
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-gray-400">ソース数による重要度ブースト:</p>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <span>1ソース: 1.0x</span>
                  <span>2ソース: 1.2x</span>
                  <span>3ソース: 1.4x</span>
                  <span>4+ソース: 1.6x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "scoring",
      title: "スコアリングロジック",
      icon: <BarChart3 className="w-5 h-5" />,
      description: "4段階のAI分析パイプラインで重要度を判定",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              4段階分析パイプライン
            </h4>
            <div className="space-y-3">
              {[
                {
                  stage: "Stage 1",
                  name: "スクリーニング",
                  desc: "投資関連性の迅速な評価（60→30記事に絞り込み）",
                  criteria: ["金融/市場関連性", "株価への潜在的影響", "ニュースバリュー"],
                },
                {
                  stage: "Stage 2",
                  name: "詳細分析",
                  desc: "影響予測と関連銘柄の特定",
                  criteria: ["影響銘柄の特定", "インパクト方向（上昇/下落/混合）", "サプライチェーン分析", "競合分析"],
                },
                {
                  stage: "Stage 3",
                  name: "検証",
                  desc: "予測の論理的整合性をチェック",
                  criteria: ["相関関係の検証", "一貫性スコア算出", "矛盾の検出"],
                },
                {
                  stage: "Stage 4",
                  name: "最終判定",
                  desc: "ランキングとユーザー向けサマリー生成",
                  criteria: ["最終スコア算出", "表示推奨レベル決定", "要約生成"],
                },
              ].map((stage) => (
                <div
                  key={stage.stage}
                  className="p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-brand-accent/20 text-brand-accent text-xs font-semibold rounded">
                      {stage.stage}
                    </span>
                    <span className="font-semibold text-sm">{stage.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{stage.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {stage.criteria.map((c) => (
                      <span
                        key={c}
                        className="px-1.5 py-0.5 bg-foreground/5 text-[10px] rounded"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Scale className="w-4 h-4 text-green-500" />
              スコア判定基準
            </h4>
            <div className="bg-gray-800 p-3 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-16 px-2 py-1 bg-red-500/20 text-red-500 font-bold rounded text-center">
                  8.0+
                </span>
                <span>必見 - 市場に大きな影響を与える可能性</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 px-2 py-1 bg-yellow-500/20 text-yellow-500 font-bold rounded text-center">
                  6.0+
                </span>
                <span>重要 - 注目すべきニュース</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 px-2 py-1 bg-blue-500/20 text-blue-500 font-bold rounded text-center">
                  4.0+
                </span>
                <span>参考 - 情報として把握しておく価値あり</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 px-2 py-1 bg-white/10 text-gray-400 font-bold rounded text-center">
                  4.0未満
                </span>
                <span>低優先 - 一般的なニュース</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              スコア調整ロジック
            </h4>
            <div className="bg-gray-800 p-3 rounded-lg text-xs">
              <p className="text-gray-400 mb-2">最終スコア = ベーススコア × ブースト × 検証補正</p>
              <ul className="space-y-1">
                <li>• 検証失敗時: -20% ペナルティ</li>
                <li>• 一貫性スコアを乗算</li>
                <li>• ソース数ブーストを適用</li>
                <li>• 最大値は10.0でキャップ</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "stock-relations",
      title: "関連株マッピング",
      icon: <GitBranch className="w-5 h-5" />,
      description: "50以上の主要銘柄のサプライチェーン・競合関係",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">関連性カテゴリ</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "supply_chain", label: "サプライチェーン", desc: "部品供給・製造委託先" },
                { name: "competitors", label: "競合", desc: "同業他社・代替製品" },
                { name: "sector_etf", label: "セクターETF", desc: "同セクターのETF" },
                { name: "index", label: "指数", desc: "構成銘柄となる指数" },
              ].map((cat) => (
                <div
                  key={cat.name}
                  className="p-3 bg-gray-800 rounded-lg"
                >
                  <div className="font-semibold text-sm">{cat.label}</div>
                  <div className="text-[10px] text-gray-400">{cat.desc}</div>
                  <code className="text-[10px] text-brand-accent">{cat.name}</code>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">主要銘柄の関連マッピング例</h4>
            <div className="space-y-3">
              {[
                {
                  symbol: "AAPL",
                  name: "Apple Inc.",
                  relations: {
                    supply_chain: ["TSM", "HON", "QCOM", "AVGO"],
                    competitors: ["MSFT", "GOOGL", "SMSN.F"],
                    sector_etf: ["XLK", "VGT"],
                    index: ["SPY", "QQQ", "DIA"],
                  },
                },
                {
                  symbol: "NVDA",
                  name: "NVIDIA Corp.",
                  relations: {
                    supply_chain: ["TSM", "SK", "MU", "LRCX", "ASML"],
                    competitors: ["AMD", "INTC", "QCOM"],
                    sector_etf: ["SMH", "SOXX", "XLK"],
                    index: ["SPY", "QQQ"],
                  },
                },
                {
                  symbol: "TSLA",
                  name: "Tesla Inc.",
                  relations: {
                    supply_chain: ["PANASONIC", "ALB", "SQM", "LAC"],
                    competitors: ["F", "GM", "RIVN", "NIO", "LCID"],
                    sector_etf: ["XLY", "DRIV"],
                    index: ["SPY", "QQQ"],
                  },
                },
              ].map((stock) => (
                <div
                  key={stock.symbol}
                  className="p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-brand-accent/20 text-brand-accent font-bold text-sm rounded">
                      {stock.symbol}
                    </span>
                    <span className="text-sm text-gray-400">{stock.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">サプライチェーン:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {stock.relations.supply_chain.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">競合:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {stock.relations.competitors.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">カバー範囲</h4>
            <div className="bg-gray-800 p-3 rounded-lg text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { sector: "Big Tech", count: "6銘柄" },
                  { sector: "半導体", count: "7銘柄" },
                  { sector: "EV・自動車", count: "5銘柄" },
                  { sector: "金融", count: "5銘柄" },
                  { sector: "ヘルスケア", count: "5銘柄" },
                  { sector: "エネルギー", count: "3銘柄" },
                  { sector: "小売・消費財", count: "5銘柄" },
                  { sector: "産業・航空", count: "4銘柄" },
                  { sector: "不動産", count: "2銘柄" },
                  { sector: "ソフトウェア", count: "4銘柄" },
                  { sector: "リチウム・鉱業", count: "2銘柄" },
                  { sector: "主要ETF", count: "2銘柄" },
                ].map((item) => (
                  <div key={item.sector} className="flex justify-between">
                    <span>{item.sector}</span>
                    <span className="text-brand-accent">{item.count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-white/10">
                <span className="text-gray-400">合計: </span>
                <span className="text-brand-accent font-bold">50+ 銘柄</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "categories",
      title: "ニュースカテゴリ分類",
      icon: <Filter className="w-5 h-5" />,
      description: "9種類のカテゴリでニュースを自動分類",
      content: (
        <div className="space-y-4">
          <div className="grid gap-2">
            {[
              { id: "monetary_policy", name: "金融政策", desc: "中央銀行の決定、金利変更、量的緩和" },
              { id: "fiscal_policy", name: "財政政策", desc: "政府支出、税制改革、予算" },
              { id: "earnings", name: "決算", desc: "企業決算発表、業績見通し" },
              { id: "mergers_acquisitions", name: "M&A", desc: "合併・買収ニュース" },
              { id: "regulation", name: "規制", desc: "規制変更、法改正、政策" },
              { id: "geopolitics", name: "地政学", desc: "貿易戦争、制裁、紛争" },
              { id: "technology", name: "テクノロジー", desc: "AI、半導体、EV技術" },
              { id: "commodities", name: "コモディティ", desc: "原油、金、農産物" },
              { id: "macro_data", name: "マクロ経済", desc: "GDP、インフレ、雇用統計" },
            ].map((cat) => (
              <div
                key={cat.id}
                className="p-3 bg-gray-800 rounded-lg flex items-start gap-3"
              >
                <code className="px-2 py-0.5 bg-white/10 text-xs rounded shrink-0">
                  {cat.id}
                </code>
                <div>
                  <div className="font-semibold text-sm">{cat.name}</div>
                  <div className="text-xs text-gray-400">{cat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">ロジック確認</h1>
          <p className="text-sm text-gray-400">
            ニュース抽出・スコアリング・関連株のロジック詳細
          </p>
        </div>
      </div>

      {/* Logic Sections */}
      <div className="space-y-3">
        {logicSections.map((section) => (
          <div key={section.id} className="card overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-4 sm:p-5 flex items-center gap-4 hover:bg-gray-900/50 transition-colors text-left"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-500 flex-shrink-0">
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base sm:text-lg">{section.title}</h2>
                <p className="text-xs sm:text-sm text-gray-400">
                  {section.description}
                </p>
              </div>
              {expandedSections.has(section.id) ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </button>
            {expandedSections.has(section.id) && (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-white/10">
                <div className="pt-4">{section.content}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="card p-4 sm:p-6 bg-gray-900 border-brand-accent/20">
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <span className="text-brand-accent">ℹ️</span>
            AIモデル情報
          </h3>
          <div className="text-xs sm:text-sm text-gray-400 space-y-1.5">
            <p>
              <strong>使用モデル:</strong> Gemini 2.0 Flash（優先）/ GPT-4o-mini（フォールバック）
            </p>
            <p>
              <strong>分析頻度:</strong> 毎日6:00 AM（JST）に自動実行、または手動実行
            </p>
            <p>
              <strong>翻訳:</strong> 英語のニュースは自動的に日本語に翻訳されます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
