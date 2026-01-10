"use client";

import React, { useState, useEffect } from "react";
import { configApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import { X, Save, Settings as SettingsIcon } from "lucide-react";

interface SystemConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (message: string) => void;
  onError: (message: string) => void;
}

export default function SystemConfigModal({
  isOpen,
  onClose,
  onSave,
  onError,
}: SystemConfigModalProps) {
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [priceDataSource, setPriceDataSource] = useState("yfinance");
  const [alphaVantageKey, setAlphaVantageKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConfigs();
    }
  }, [isOpen]);

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
      logger.error("Failed to fetch configs:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save all configs
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

      onSave("システム設定を保存しました");
      onClose();
    } catch (error) {
      onError("システム設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-950 border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-950 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gold/20 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-xl font-bold">外部システム設定</h2>
              <p className="text-sm text-gray-400">
                外部連携とデータソースの設定
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
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
            <p className="text-xs text-gray-400 mt-1">
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
            <p className="text-xs text-gray-400 mt-1">
              AI による価格変動分析を有効化
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 pt-6">
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
              <p className="text-xs text-gray-400 mt-1">
                株価データを取得するデータソースを選択
              </p>
            </div>

            {/* Alpha Vantage API Key (conditional) */}
            {priceDataSource === "alphavantage" && (
              <div className="bg-gray-900 rounded-lg p-4 border border-white/10">
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
                <p className="text-xs text-gray-400 mt-2">
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
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-950 border-t border-white/10 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={saving}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary flex items-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="spinner"></div>
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
