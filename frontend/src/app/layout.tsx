import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { QueryProvider } from "@/providers/QueryProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Pure Price Press - 価格こそが真実",
  description: "バイアスのかかっていない真実のニュースをお金の動きから分析する",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pure Price Press",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFD700",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-gray-950 text-white">
        <QueryProvider>
        {/* Header */}
        <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
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
                  <p className="text-xs text-gray-400">
                    ニュースからバイアスを取り除こう
                  </p>
                </div>
              </Link>

              {/* Navigation */}
              <MobileNav />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">{children}</main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-gray-900 mt-20">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-400">
                <p>
                  <span className="font-bold text-white">
                    Pure Price Press
                  </span>{" "}
                  - ニュースからバイアスを取り除こう
                </p>
                <p className="mt-1">
                  © {new Date().getFullYear()} Pure Price Press. All rights reserved.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-brand-accent transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-brand-accent transition-colors"
                >
                  ドキュメント
                </a>
              </div>
            </div>
          </div>
        </footer>
        </QueryProvider>
      </body>
    </html>
  );
}
