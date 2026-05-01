"use client";

import { useState, useEffect } from "react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function StorageUsage({ className = "" }: { className?: string }) {
  const [usage, setUsage] = useState<number | null>(null);
  const [quota, setQuota] = useState<number | null>(null);

  const refresh = () => {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      navigator.storage.estimate().then(({ usage: u, quota: q }) => {
        setUsage(u ?? null);
        setQuota(q ?? null);
      });
    }
  };

  useEffect(() => {
    refresh();
    const onVis = () => refresh();
    window.addEventListener("focus", onVis);
    return () => window.removeEventListener("focus", onVis);
  }, []);

  if (usage === null && quota === null) return null;

  const used = usage ?? 0;
  const total = quota ?? 0;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;

  return (
    <div
      className={`rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Storage: ${formatBytes(used)} used of ${formatBytes(total)}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-foreground">Browser storage</span>
        <span className="tabular-nums">
          {formatBytes(used)} used
          {total > 0 ? ` · ${formatBytes(Math.max(total - used, 0))} left` : ""}
        </span>
      </div>
      {total > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      )}
      {total > 0 && (
        <p className="mt-1.5 tabular-nums">
          {pct}% of this browser&apos;s available site storage is in use.
        </p>
      )}
    </div>
  );
}
