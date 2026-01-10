"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useConfigs, useUpdateConfigs } from "@/hooks/useConfig";
import { usePushNotification } from "@/hooks/usePushNotification";
import Skeleton from "@/components/Skeleton";
import {
  ArrowLeft,
  Bell,
  BellOff,
  AlertCircle,
  CheckCircle,
  Save,
  MessageSquare,
} from "lucide-react";

export default function NotificationsSettingsPage() {
  const { data: configs = [], isLoading } = useConfigs();
  const updateConfigs = useUpdateConfigs();

  const {
    permission,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    isSupported,
    subscribe,
    unsubscribe,
  } = usePushNotification();

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [discordWebhook, setDiscordWebhook] = useState("");

  useEffect(() => {
    if (configs.length > 0) {
      const webhook = configs.find((c) => c.key === "discord_webhook_url");
      if (webhook) setDiscordWebhook(webhook.value);
    }
  }, [configs]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveDiscord = async (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigs.mutate(
      { discord_webhook_url: discordWebhook },
      {
        onSuccess: () => showMessage("success", "Discord設定を保存しました"),
        onError: () => showMessage("error", "保存に失敗しました"),
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
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">通知設定</h1>
          <p className="text-sm text-gray-400">
            プッシュ通知とDiscord連携の設定
          </p>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`card p-3 sm:p-4 border-l-4 ${
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
            <h2 className="text-lg sm:text-xl font-bold">プッシュ通知</h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
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
              <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  {isSubscribed ? (
                    <Bell className="w-5 h-5 text-green-500" />
                  ) : (
                    <BellOff className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm sm:text-base font-medium">
                      {isSubscribed ? "通知 ON" : "通知 OFF"}
                    </p>
                    <p className="text-xs text-gray-400">
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
                      ? "bg-white/10 hover:bg-white/20 text-white"
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

      {/* Discord Webhook Card */}
      <form onSubmit={handleSaveDiscord} className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-bold">Discord通知</h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Discordでアラート通知を受信
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton variant="config" count={1} />
        ) : (
          <div className="space-y-4">
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
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                Discord サーバーの設定からWebhook URLを取得してください
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full flex items-center justify-center gap-2 text-sm sm:text-base py-2.5"
            >
              {saving ? (
                <>
                  <div className="spinner w-4 h-4"></div>
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
        )}
      </form>
    </div>
  );
}
