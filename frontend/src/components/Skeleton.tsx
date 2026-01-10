"use client";

import React from "react";

interface SkeletonProps {
  variant?: "card" | "stats" | "text" | "config";
  count?: number;
  className?: string;
}

export default function Skeleton({ variant = "card", count = 1, className = "" }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "stats") {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 ${className}`}>
        {items.map((i) => (
          <div key={i} className="card p-3 sm:p-6 animate-pulse">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-lg" />
              <div className="space-y-2">
                <div className="h-5 sm:h-7 w-12 bg-white/10 rounded" />
                <div className="h-2 sm:h-3 w-16 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "config") {
    return (
      <div className={`space-y-4 sm:space-y-6 ${className}`}>
        {items.map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-24 bg-white/10 rounded mb-2" />
            <div className="h-10 w-full bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={`space-y-2 ${className}`}>
        {items.map((i) => (
          <div key={i} className="h-4 bg-white/10 rounded animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }} />
        ))}
      </div>
    );
  }

  // Default: card variant
  return (
    <div className={`space-y-2 sm:space-y-3 ${className}`}>
      {items.map((i) => (
        <div key={i} className="card animate-pulse p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-white/10 rounded" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 bg-white/10 rounded" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
              <div className="h-3 w-32 bg-white/10 rounded" />
            </div>
            <div className="h-8 w-16 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
