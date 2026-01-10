"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { alertsApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import type { AlertHistory, PriceData } from "@/lib/types";
import StockChart from "@/components/StockChart";
import {
  formatPercent,
  formatCurrency,
  formatAbsoluteTime,
  formatLargeNumber,
  getAlertSeverity,
  getAlertSeverityLabel,
  getChangeRateColorClass,
  cn,
} from "@/lib/utils";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
} from "lucide-react";

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const alertId = parseInt(params.id as string);

  const [alert, setAlert] = useState<AlertHistory | null>(null);
  const [chartData, setChartData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const data = await alertsApi.getById(alertId);
        setAlert(data);

        // Generate mock chart data for demonstration
        // In production, this would fetch real historical data
        const mockData = generateMockChartData(
          data.price_before,
          data.price_after,
          data.triggered_at
        );
        setChartData(mockData);
      } catch (error) {
        logger.error("Failed to fetch alert:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlert();
  }, [alertId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card animate-pulse">
          <div className="h-96"></div>
        </div>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Alert Not Found</h2>
          <p className="text-gray-400 mb-6">
            The requested alert could not be found.
          </p>
          <button onClick={() => router.push("/")} className="btn btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const severity = getAlertSeverity(alert.change_rate);
  const isPositive = alert.change_rate > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header Card */}
      <div
        className={cn(
          "card border-l-4",
          severity === "critical" && "border-l-critical",
          severity === "high" && "border-l-orange-500",
          severity === "medium" && "border-l-yellow-500",
          severity === "low" && "border-l-blue-500"
        )}
      >
        <div className="flex items-start justify-between mb-6">
          {/* Title */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-16 h-16 rounded-lg flex items-center justify-center",
                isPositive ? "bg-surge/20" : "bg-drop/20"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-8 h-8 text-surge" />
              ) : (
                <TrendingDown className="w-8 h-8 text-drop" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{alert.symbol}</h1>
              <p className="text-gray-400 flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4" />
                {formatAbsoluteTime(alert.triggered_at)}
              </p>
            </div>
          </div>

          {/* Severity Badge */}
          <div
            className={cn(
              "badge text-lg px-4 py-2",
              severity === "critical" && "severity-critical",
              severity === "high" && "severity-high",
              severity === "medium" && "severity-medium",
              severity === "low" && "severity-low"
            )}
          >
            {getAlertSeverityLabel(severity)}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Change Rate */}
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
              <Activity className="w-4 h-4" />
              Change Rate
            </p>
            <p
              className={cn(
                "text-3xl font-bold",
                getChangeRateColorClass(alert.change_rate)
              )}
            >
              {formatPercent(alert.change_rate)}
            </p>
          </div>

          {/* Change Amount */}
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Change Amount
            </p>
            <p
              className={cn(
                "text-3xl font-bold",
                getChangeRateColorClass(alert.change_rate)
              )}
            >
              {formatCurrency(Math.abs(alert.change_amount))}
            </p>
          </div>

          {/* Price Before */}
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">Price Before</p>
            <p className="text-2xl font-mono font-bold">
              {formatCurrency(alert.price_before)}
            </p>
          </div>

          {/* Price After */}
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">Price After</p>
            <p className="text-2xl font-mono font-bold">
              {formatCurrency(alert.price_after)}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        {(alert.volume || alert.market_cap) && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {alert.volume && (
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Volume:</span>
                <span className="font-medium">
                  {formatLargeNumber(alert.volume)}
                </span>
              </div>
            )}
            {alert.market_cap && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Market Cap:</span>
                <span className="font-medium">
                  ${formatLargeNumber(alert.market_cap)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Section */}
      <div className="card">
        <StockChart
          data={chartData}
          symbol={alert.symbol}
          alertTime={Math.floor(new Date(alert.triggered_at).getTime() / 1000)}
        />
      </div>

      {/* AI Analysis Section */}
      {alert.ai_analysis_text && (
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">📰</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4 text-gradient">
                Pure Price Press Analysis
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-lg leading-relaxed text-gray-300 whitespace-pre-line">
                  {alert.ai_analysis_text}
                </p>
              </div>
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-gray-400 italic">
                  "価格こそが真実。ニュースは見せかけに過ぎない。"
                  <br />
                  - Pure Price Press Philosophy
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Status */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Notification Status</h3>
        <div className="flex items-center gap-3">
          {alert.notified ? (
            <>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-500 text-xl">✓</span>
              </div>
              <div>
                <p className="font-medium text-green-500">
                  Notification Sent Successfully
                </p>
                <p className="text-sm text-gray-400">
                  Alert was sent to configured channels
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <span className="text-orange-500 text-xl">⚠</span>
              </div>
              <div>
                <p className="font-medium text-orange-500">
                  Notification Pending or Failed
                </p>
                {alert.notification_error && (
                  <p className="text-sm text-gray-400">
                    Error: {alert.notification_error}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to generate mock chart data
function generateMockChartData(
  priceBefore: number,
  priceAfter: number,
  triggeredAt: string
): PriceData[] {
  const data: PriceData[] = [];
  const endTime = new Date(triggeredAt).getTime() / 1000;
  const startTime = endTime - 24 * 60 * 60; // 24 hours before

  const volatility = 0.01; // 1% volatility
  let currentPrice = priceBefore;

  // Generate data points every 5 minutes
  for (let time = startTime; time <= endTime; time += 5 * 60) {
    // Add some random walk
    const change = (Math.random() - 0.5) * volatility * currentPrice;
    currentPrice += change;

    // If we're close to the trigger time, move towards priceAfter
    if (time > endTime - 60 * 60) {
      // Last hour
      const progress = (time - (endTime - 60 * 60)) / (60 * 60);
      currentPrice = priceBefore + (priceAfter - priceBefore) * progress;
    }

    data.push({
      time: Math.floor(time) as number,
      value: parseFloat(currentPrice.toFixed(2)),
    });
  }

  return data;
}
