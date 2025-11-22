import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { TrendingUp, Settings, Activity } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Pure Price Press - 価格こそが真実",
  description: "バイアスのかかっていない真実のニュースをお金の動きから分析する",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-foreground/10 bg-background-secondary/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center group-hover:shadow-glow transition-all">
                  <TrendingUp className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gradient">
                    Pure Price Press
                  </h1>
                  <p className="text-xs text-foreground-muted">
                    ニュースからバイアスを取り除こう
                  </p>
                </div>
              </Link>

              {/* Navigation */}
              <nav className="flex items-center gap-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-background-tertiary transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  <span>ダッシュボード</span>
                </Link>
                <Link
                  href="/targets"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-background-tertiary transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>銘柄登録</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-background-tertiary transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>設定</span>
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">{children}</main>

        {/* Footer */}
        <footer className="border-t border-foreground/10 bg-background-secondary mt-20">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-foreground-muted">
                <p>
                  <span className="font-bold text-foreground">
                    Pure Price Press
                  </span>{" "}
                  - ニュースからバイアスを取り除こう
                </p>
                <p className="mt-1">
                  © 2024 Pure Price Press. All rights reserved.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground-muted hover:text-brand-accent transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="#"
                  className="text-foreground-muted hover:text-brand-accent transition-colors"
                >
                  ドキュメント
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
