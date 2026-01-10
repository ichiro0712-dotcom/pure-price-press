"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { systemApi, type SystemStatus } from "@/lib/api";
import {
  ArrowLeft,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Key,
  ExternalLink,
} from "lucide-react";

export default function ExternalSystemsPage() {

  const {
    data: statusData,
    isLoading: statusLoading,
    refetch: refetchStatus,
    isFetching: statusFetching,
  } = useQuery({
    queryKey: ["system-status"],
    queryFn: systemApi.getStatus,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: keysData, isLoading: keysLoading, isError: keysError } = useQuery({
    queryKey: ["api-keys"],
    queryFn: systemApi.getApiKeys,
  });

  const getStatusIcon = (status: SystemStatus["status"]) => {
    switch (status) {
      case "connected":
      case "configured":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "rate_limited":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "not_configured":
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: SystemStatus["status"]) => {
    switch (status) {
      case "connected":
        return "接続済み";
      case "configured":
        return "設定済み";
      case "error":
        return "エラー";
      case "rate_limited":
        return "レート制限中";
      case "not_configured":
        return "未設定";
      default:
        return "不明";
    }
  };

  const getStatusColor = (status: SystemStatus["status"]) => {
    switch (status) {
      case "connected":
      case "configured":
        return "text-green-500 bg-green-500/10";
      case "error":
        return "text-red-500 bg-red-500/10";
      case "rate_limited":
        return "text-yellow-500 bg-yellow-500/10";
      case "not_configured":
        return "text-gray-400 bg-gray-500/10";
      default:
        return "text-gray-400 bg-gray-500/10";
    }
  };

  const getOverallStatusBadge = () => {
    if (!statusData) return null;

    const { overall_status } = statusData;
    const colors = {
      healthy: "bg-green-500/20 text-green-500 border-green-500/30",
      degraded: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      minimal: "bg-red-500/20 text-red-500 border-red-500/30",
    };

    const labels = {
      healthy: "正常",
      degraded: "一部問題あり",
      minimal: "最小構成",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium border ${colors[overall_status]}`}
      >
        {labels[overall_status]}
      </span>
    );
  };

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
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">外部システム設定</h1>
          <p className="text-sm text-gray-400">
            API接続状況の確認とキー管理
          </p>
        </div>
        {getOverallStatusBadge()}
      </div>

      {/* Connection Status Card */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">接続状況</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                外部APIの接続状態をリアルタイム確認
              </p>
            </div>
          </div>
          <button
            onClick={() => refetchStatus()}
            disabled={statusFetching}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${statusFetching ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">更新</span>
          </button>
        </div>

        {statusLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-900 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {statusData?.systems.map((system) => (
              <div
                key={system.name}
                className="p-4 bg-gray-900 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(system.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{system.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                          system.status
                        )}`}
                      >
                        {getStatusText(system.status)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">
                      {system.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>
                        APIキー:{" "}
                        <code className="bg-gray-800 px-1.5 py-0.5 rounded">
                          {system.api_key_preview}
                        </code>
                      </span>
                      {system.env_var && (
                        <span>
                          環境変数:{" "}
                          <code className="bg-gray-800 px-1.5 py-0.5 rounded">
                            {system.env_var}
                          </code>
                        </span>
                      )}
                    </div>
                    {system.error && (
                      <p className="text-xs text-red-500 mt-2">
                        エラー: {system.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Keys Card */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-gold/20 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 sm:w-6 sm:h-6 text-brand-gold" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">APIキー管理</h2>
            <p className="text-xs sm:text-sm text-gray-400">
              設定済みのAPIキーを表示・コピー
            </p>
          </div>
        </div>

        {keysLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-900 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : keysError ? (
          <div className="text-center py-8 text-red-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">APIキー情報の取得に失敗しました</p>
          </div>
        ) : keysData?.keys && keysData.keys.length > 0 ? (
          <div className="space-y-3">
            {keysData.keys.map((key) => (
              <div
                key={key.name}
                className="p-4 bg-gray-900 rounded-lg"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{key.display_name}</h3>
                      <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                        {key.source === "environment" ? "環境変数" : "データベース"}
                      </span>
                      {key.is_set && (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      )}
                    </div>
                    <code className="text-xs text-gray-400 mt-1 block font-mono">
                      {key.masked_value}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">設定済みのAPIキーはありません</p>
          </div>
        )}
      </div>

      {/* API Setup Links */}
      <div className="card p-4 sm:p-6 bg-gray-900">
        <h3 className="text-sm font-bold mb-4">APIキー取得リンク</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-gray-950 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            <span className="flex-1 text-sm">Gemini API Key</span>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-brand-accent" />
          </a>
          <a
            href="https://www.alphavantage.co/support/#api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-gray-950 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            <span className="flex-1 text-sm">Alpha Vantage API Key</span>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-brand-accent" />
          </a>
          <a
            href="https://finnhub.io/register"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-gray-950 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            <span className="flex-1 text-sm">Finnhub API Key</span>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-brand-accent" />
          </a>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-gray-950 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            <span className="flex-1 text-sm">OpenAI API Key</span>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-brand-accent" />
          </a>
        </div>
      </div>
    </div>
  );
}
