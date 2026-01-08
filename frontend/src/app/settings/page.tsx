"use client";

import React, { useState, useEffect } from "react";
import { useConfigs, useUpdateConfigs } from "@/hooks/useConfig";
import { usePushNotification } from "@/hooks/usePushNotification";
import Skeleton from "@/components/Skeleton";
import {
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
  Save,
  Bell,
  BellOff,
} from "lucide-react";

export default function SettingsPage() {
  // React Query hooks
  const { data: configs = [], isLoading } = useConfigs();
  const updateConfigs = useUpdateConfigs();

  // Push notification hook
  const {
    permission,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    isSupported,
    subscribe,
    unsubscribe,
  } = usePushNotification();

  // Local form state
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [priceDataSource, setPriceDataSource] = useState("yfinance");
  const [alphaVantageKey, setAlphaVantageKey] = useState("");

  // Populate form from cached data
  useEffect(() => {
    if (configs.length > 0) {
      const webhook = configs.find((c) => c.key === "discord_webhook_url");
      const apiKey = configs.find((c) => c.key === "openai_api_key");
      const dataSource = configs.find((c) => c.key === "price_data_source");
      const avKey = configs.find((c) => c.key === "alpha_vantage_api_key");

      if (webhook) setDiscordWebhook(webhook.value);
      if (apiKey) setOpenaiKey(apiKey.value);
      if (dataSource) setPriceDataSource(dataSource.value);
      if (avKey) setAlphaVantageKey(avKey.value);
    }
  }, [configs]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    updateConfigs.mutate(
      {
        discord_webhook_url: discordWebhook,
        openai_api_key: openaiKey,
        price_data_source: priceDataSource,
        alpha_vantage_api_key: alphaVantageKey,
      },
      {
        onSuccess: () => showMessage("success", "システム設定を保存しました"),
        onError: () => showMessage("error", "システム設定の保存に失敗しました"),
      }
    );
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        showMessage("success", "プッシュ通知を無効にしました");
      }
    } else {
      const success = await subscribe();
      if (success) {
        showMessage("success", "プッシュ通知を有効にしました");
      }
    }
  };

  const saving = updateConfigs.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">設定</h1>
        <p className="text-sm sm:text-base text-foreground-muted">
          外部システム連携とデータソースの設定
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`card p-3 sm:p-6 border-l-4 ${
            message.type === "success"
              ? "border-l-green-500 bg-green-500/10"
              : "border-l-red-500 bg-red-500/10"
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            {message.type === "success" ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
            )}
            <p className="text-xs sm:text-sm">{message.text}</p>
          </div>
        </div>
      )}

      {/* Push Notification Card */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg sm:text-2xl font-bold">プッシュ通知</h2>
            <p className="text-xs sm:text-sm text-foreground-muted mt-0.5 sm:mt-1">
              ブラウザを閉じていても通知を受け取れます
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {!isSupported ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">
                このブラウザはプッシュ通知に対応していません
              </p>
            </div>
          ) : permission === "denied" ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                通知がブロックされています。ブラウザの設定から許可してください。
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 sm:p-4 bg-background-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  {isSubscribed ? (
                    <Bell className="w-5 h-5 text-green-500" />
                  ) : (
                    <BellOff className="w-5 h-5 text-foreground-muted" />
                  )}
                  <div>
                    <p className="text-sm sm:text-base font-medium">
                      {isSubscribed ? "通知 ON" : "通知 OFF"}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {isSubscribed
                        ? "アラート発生時に通知されます"
                        : "通知を有効にして価格変動を見逃さない"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePushToggle}
                  disabled={pushLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSubscribed
                      ? "bg-foreground/10 hover:bg-foreground/20 text-foreground"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  } disabled:opacity-50`}
                >
                  {pushLoading ? (
                    <div className="spinner w-4 h-4"></div>
                  ) : isSubscribed ? (
                    "無効にする"
                  ) : (
                    "有効にする"
                  )}
                </button>
              </div>

              {pushError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                    {pushError}
                  </p>
                </div>
              )}

              {isSubscribed && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                    ✓ プッシュ通知が有効です
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* System Configuration Form */}
      <form onSubmit={handleSave} className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-gold/20 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-gold" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg sm:text-2xl font-bold">外部システム設定</h2>
            <p className="text-xs sm:text-sm text-foreground-muted mt-0.5 sm:mt-1">
              通知、AI分析、データソースの設定
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton variant="config" count={3} />
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Discord Webhook */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                Discord Webhook URL
              </label>
              <input
                type="url"
                className="input w-full text-sm sm:text-base"
                placeholder="https://discord.com/api/webhooks/..."
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
              />
              <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
                Discordでアラート通知を受信
              </p>
            </div>

            {/* OpenAI API Key */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                className="input w-full text-sm sm:text-base"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
                AI による価格変動分析を有効化
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-foreground/10 pt-4 sm:pt-6">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">株価データソース</h3>

              {/* Data Source Selection */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                  データソース
                </label>
                <select
                  className="input w-full text-sm sm:text-base"
                  value={priceDataSource}
                  onChange={(e) => setPriceDataSource(e.target.value)}
                >
                  <option value="yfinance">Yahoo Finance - 無料</option>
                  <option value="alphavantage">Alpha Vantage - API キー必要</option>
                </select>
                <p className="text-[10px] sm:text-xs text-foreground-muted mt-1">
                  株価データを取得するソースを選択
                </p>
              </div>

              {/* Alpha Vantage API Key (conditional) */}
              {priceDataSource === "alphavantage" && (
                <div className="bg-background-secondary rounded-lg p-3 sm:p-4 border border-foreground/10">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                    Alpha Vantage API Key
                  </label>
                  <input
                    type="password"
                    className="input w-full text-sm sm:text-base"
                    placeholder="YOUR_API_KEY"
                    value={alphaVantageKey}
                    onChange={(e) => setAlphaVantageKey(e.target.value)}
                  />
                  <p className="text-[10px] sm:text-xs text-foreground-muted mt-1.5 sm:mt-2">
                    API キーが必要です。
                    <a
                      href="https://www.alphavantage.co/support/#api-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-accent hover:underline ml-1"
                    >
                      無料取得
                    </a>
                  </p>
                </div>
              )}

              {priceDataSource === "yfinance" && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                    ✓ API キー不要で利用できます
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full flex items-center justify-center gap-2 text-sm sm:text-base py-2.5 sm:py-3"
            >
              {saving ? (
                <>
                  <div className="spinner w-4 h-4 sm:w-5 sm:h-5"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                  設定を保存
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Additional Info */}
      <div className="card p-4 sm:p-6 bg-background-secondary border-brand-accent/20">
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <span className="text-brand-accent">ℹ️</span>
            設定のヒント
          </h3>
          <div className="text-xs sm:text-sm text-foreground-muted space-y-1.5 sm:space-y-2">
            <p>
              <strong>初めての方:</strong> まずは銘柄登録ページから監視したい銘柄を追加してください。
            </p>
            <p>
              <strong>推奨設定:</strong> プッシュ通知を有効にすると、ブラウザを閉じていても通知を受け取れます。
            </p>
            <p>
              <strong>データソース:</strong> Yahoo Finance（無料・APIキー不要）の使用を推奨します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
