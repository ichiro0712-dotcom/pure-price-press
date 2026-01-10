"use client";

import React, { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import type { PriceData } from "@/lib/types";

interface StockChartProps {
  data: PriceData[];
  symbol: string;
  alertTime?: number;
}

export default function StockChart({
  data,
  symbol,
  alertTime,
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#111827" },
        textColor: "#D1D5DB",
      },
      grid: {
        vertLines: { color: "#1F2937" },
        horzLines: { color: "#1F2937" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#1F2937",
      },
      crosshair: {
        vertLine: {
          color: "#3B82F6",
          width: 1,
          style: 2,
          labelBackgroundColor: "#1E40AF",
        },
        horzLine: {
          color: "#3B82F6",
          width: 1,
          style: 2,
          labelBackgroundColor: "#1E40AF",
        },
      },
    });

    chartRef.current = chart;

    // Create area series
    const areaSeries = chart.addAreaSeries({
      lineColor: "#3B82F6",
      topColor: "rgba(59, 130, 246, 0.4)",
      bottomColor: "rgba(59, 130, 246, 0.0)",
      lineWidth: 2,
    });

    seriesRef.current = areaSeries;

    // Set data - convert time to UTCTimestamp
    const chartData = data.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.value,
    }));
    areaSeries.setData(chartData);

    // Add marker for alert time if provided
    if (alertTime) {
      const alertMarker = {
        time: alertTime as UTCTimestamp,
        position: "inBar" as const,
        color: "#EF4444",
        shape: "arrowDown" as const,
        text: "Alert",
      };

      areaSeries.setMarkers([alertMarker]);
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [data, alertTime]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{symbol} - 24H Chart</h3>
        <p className="text-sm text-gray-400">
          Price movement over the last 24 hours
        </p>
      </div>
      <div
        ref={chartContainerRef}
        className="bg-gray-900 rounded-lg border border-white/10"
      />
    </div>
  );
}
