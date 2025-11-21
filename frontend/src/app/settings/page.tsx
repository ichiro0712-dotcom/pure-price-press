"use client";

import React, { useState, useEffect } from "react";
import { configApi } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [discordWebhook, setDiscordWebhook] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [priceDataSource, setPriceDataSource] = useState("yfinance");
  const [alphaVantageKey, setAlphaVantageKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const configs = await configApi.getAll();
      const webhook = configs.find((c) => c.key === "discord_webhook_url");
      const apiKey = configs.find((c) => c.key === "openai_api_key");
      const dataSource = configs.find((c) => c.key === "price_data_source");
      const avKey = configs.find((c) => c.key === "alpha_vantage_api_key");

      if (webhook) setDiscordWebhook(webhook.value);
      if (apiKey) setOpenaiKey(apiKey.value);
      if (dataSource) setPriceDataSource(dataSource.value);
      if (avKey) setAlphaVantageKey(avKey.value);
    } catch (error) {
      console.error("Failed to fetch configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        configApi.set(
          "discord_webhook_url",
          discordWebhook,
          "Discord webhook URL for alert notifications"
        ),
        configApi.set(
          "openai_api_key",
          openaiKey,
          "OpenAI API key for AI analysis"
        ),
        configApi.set(
          "price_data_source",
          priceDataSource,
          "Price data source (yfinance, alphavantage, etc.)"
        ),
        configApi.set(
          "alpha_vantage_api_key",
          alphaVantageKey,
          "Alpha Vantage API key for stock data"
        ),
      ]);

      showMessage("success", "システム設定を保存しました");
    } catch (error) {
      showMessage("error", "システム設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">設定</h1>
        <p className="text-foreground-muted">
          外部システム連携とデータソースの設定
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`card border-l-4 ${
            message.type === "success"
              ? "border-l-green-500 bg-green-500/10"
              : "border-l-red-500 bg-red-500/10"
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        </div>
      )}

      {/* System Configuration Form */}
      <form onSubmit={handleSave} className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-brand-gold/20 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-brand-gold" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">外部システム設定</h2>
            <p className="text-sm text-foreground-muted mt-1">
              Discord通知、AI分析、株価データソースの設定を管理
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-20 bg-background-secondary animate-pulse rounded-lg"></div>
            <div className="h-20 bg-background-secondary animate-pulse rounded-lg"></div>
            <div className="h-20 bg-background-secondary animate-pulse rounded-lg"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Discord Webhook */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Discord Webhook URL
              </label>
              <input
                type="url"
                className="input w-full"
                placeholder="https://discord.com/api/webhooks/..."
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
              />
              <p className="text-xs text-foreground-muted mt-1">
                Discordでアラート通知を受信
              </p>
            </div>

            {/* OpenAI API Key */}
            <div>
              <label className="block text-sm font-medium mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                className="input w-full"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-foreground-muted mt-1">
                AI による価格変動分析を有効化
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-foreground/10 pt-6">
              <h3 className="text-lg font-bold mb-4">株価データソース設定</h3>

              {/* Data Source Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  データソース
                </label>
                <select
                  className="input w-full"
                  value={priceDataSource}
                  onChange={(e) => setPriceDataSource(e.target.value)}
                >
                  <option value="yfinance">Yahoo Finance (yfinance) - 無料</option>
                  <option value="alphavantage">Alpha Vantage - API キー必要</option>
                </select>
                <p className="text-xs text-foreground-muted mt-1">
                  株価データを取得するデータソースを選択
                </p>
              </div>

              {/* Alpha Vantage API Key (conditional) */}
              {priceDataSource === "alphavantage" && (
                <div className="bg-background-secondary rounded-lg p-4 border border-foreground/10">
                  <label className="block text-sm font-medium mb-2">
                    Alpha Vantage API Key
                  </label>
                  <input
                    type="password"
                    className="input w-full"
                    placeholder="YOUR_API_KEY"
                    value={alphaVantageKey}
                    onChange={(e) => setAlphaVantageKey(e.target.value)}
                  />
                  <p className="text-xs text-foreground-muted mt-2">
                    Alpha Vantage の API キーが必要です。
                    <a
                      href="https://www.alphavantage.co/support/#api-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-accent hover:underline ml-1"
                    >
                      無料取得はこちら
                    </a>
                  </p>
                </div>
              )}

              {priceDataSource === "yfinance" && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Yahoo Finance は API キー不要で利用できます
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="spinner"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  設定を保存
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Additional Info */}
      <div className="card bg-background-secondary border-brand-accent/20">
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2">
            <span className="text-brand-accent">ℹ️</span>
            設定のヒント
          </h3>
          <div className="text-sm text-foreground-muted space-y-2">
            <p>
              <strong>初めての方:</strong> まずは銘柄登録ページから監視したい銘柄を追加してください。外部システム設定は後から設定できます。
            </p>
            <p>
              <strong>推奨設定:</strong> Discord通知とOpenAI分析を有効にすると、価格変動を即座に通知し、AIが変動理由を分析してくれます。
            </p>
            <p>
              <strong>データソース:</strong> 特別な理由がない限り、Yahoo Finance（無料・APIキー不要）の使用を推奨します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
