"use client";

import React from "react";
import Link from "next/link";
import {
  Bell,
  Server,
  Cpu,
  ChevronRight,
  Settings as SettingsIcon,
} from "lucide-react";

interface SettingsMenuItem {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
}

const settingsMenuItems: SettingsMenuItem[] = [
  {
    title: "通知設定",
    description: "プッシュ通知とDiscord連携の設定",
    href: "/settings/notifications",
    icon: <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />,
    iconBg: "bg-blue-500/20",
  },
  {
    title: "外部システム設定",
    description: "API接続状況の確認とキー管理",
    href: "/settings/external-systems",
    icon: <Server className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />,
    iconBg: "bg-green-500/20",
  },
  {
    title: "ロジック確認",
    description: "ニュース抽出・スコアリング・関連株のロジック",
    href: "/settings/logic",
    icon: <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />,
    iconBg: "bg-purple-500/20",
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-gold/20 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-gold" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">設定</h1>
            <p className="text-sm sm:text-base text-gray-400">
              アプリケーションの設定を管理
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-3">
        {settingsMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card p-4 sm:p-5 flex items-center gap-4 hover:border-brand-accent/50 transition-all group"
          >
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 ${item.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold group-hover:text-brand-accent transition-colors">
                {item.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                {item.description}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-accent transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* Info Card */}
      <div className="card p-4 sm:p-6 bg-gray-900 border-brand-accent/20">
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <span className="text-brand-accent">ℹ️</span>
            設定のヒント
          </h3>
          <div className="text-xs sm:text-sm text-gray-400 space-y-1.5 sm:space-y-2">
            <p>
              <strong>初めての方:</strong> まずは銘柄登録ページから監視したい銘柄を追加してください。
            </p>
            <p>
              <strong>通知設定:</strong> プッシュ通知を有効にすると、ブラウザを閉じていても通知を受け取れます。
            </p>
            <p>
              <strong>ロジック確認:</strong> ニュースの抽出方法やスコアリングの仕組みを確認できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
