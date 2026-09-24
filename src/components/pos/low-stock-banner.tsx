"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, AlertCircle, ChevronRight, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LowStockAlertItem, StockAlertSummary } from "@/lib/stock-alerts";

interface LowStockBannerProps {
  onFilterLowStock?: (active: boolean) => void;
  isFilterActive?: boolean;
  onOpenAlertsWidget?: () => void;
}

export function LowStockBanner({
  onFilterLowStock,
  isFilterActive = false,
  onOpenAlertsWidget,
}: LowStockBannerProps) {
  const [items, setItems] = useState<LowStockAlertItem[]>([]);
  const [summary, setSummary] = useState<StockAlertSummary | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/products/low-stock", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setSummary(data.summary ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    const handleStockChange = () => fetchAlerts();
    window.addEventListener("pos:stock-changed", handleStockChange);
    window.addEventListener("focus", handleStockChange);

    const interval = setInterval(fetchAlerts, 30000);
    return () => {
      window.removeEventListener("pos:stock-changed", handleStockChange);
      window.removeEventListener("focus", handleStockChange);
      clearInterval(interval);
    };
  }, [fetchAlerts]);

  if (!summary || summary.totalBelowThreshold === 0) {
    return null;
  }

  const isSevere = summary.outOfStockCount > 0;
  const criticalItems = items.slice(0, 3);

  if (dismissed) {
    return (
      <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
        <div className="flex items-center gap-1.5 font-medium">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {summary.totalBelowThreshold} low-stock alert{summary.totalBelowThreshold > 1 ? "s" : ""} active
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="text-xs font-semibold underline hover:no-underline ml-2"
        >
          Show Alert
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "mb-3 rounded-lg border p-3 transition-all shadow-xs",
        isSevere
          ? "border-destructive/40 bg-destructive/10 text-destructive-foreground"
          : "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md border shrink-0 mt-0.5",
              isSevere
                ? "border-destructive/40 bg-destructive/20 text-destructive animate-pulse"
                : "border-amber-500/40 bg-amber-500/20 text-amber-600 dark:text-amber-400"
            )}
          >
            {isSevere ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "font-bold text-xs tracking-tight",
                  isSevere ? "text-destructive" : "text-amber-800 dark:text-amber-300"
                )}
              >
                Low-Stock Threshold Alert
              </span>
              <span className="text-xs opacity-90">
                {summary.totalBelowThreshold} item{summary.totalBelowThreshold > 1 ? "s" : ""} require attention
                {summary.outOfStockCount > 0 ? ` (${summary.outOfStockCount} out of stock)` : ""}
              </span>
            </div>

            {/* List sample affected products */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
              <span className="text-muted-foreground text-[11px]">Items:</span>
              {criticalItems.map((p, idx) => (
                <span
                  key={p.id}
                  className={cn(
                    "font-mono font-medium",
                    p.stock <= 0
                      ? "text-destructive font-bold"
                      : "text-amber-800 dark:text-amber-300"
                  )}
                >
                  {p.name} ({p.stock}/{p.lowStockThreshold})
                  {idx < criticalItems.length - 1 && <span className="text-muted-foreground mx-1">·</span>}
                </span>
              ))}
              {summary.totalBelowThreshold > 3 && (
                <span className="text-muted-foreground italic">
                  +{summary.totalBelowThreshold - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onFilterLowStock && (
            <button
              type="button"
              onClick={() => onFilterLowStock(!isFilterActive)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border transition-all",
                isFilterActive
                  ? "bg-foreground text-background border-foreground shadow-xs"
                  : isSevere
                    ? "bg-destructive/20 border-destructive/30 text-destructive hover:bg-destructive/30"
                    : "bg-amber-500/20 border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30"
              )}
            >
              <Filter className="h-3 w-3" />
              <span>{isFilterActive ? "Showing Low Stock" : "Filter Catalog"}</span>
            </button>
          )}

          {onOpenAlertsWidget && (
            <button
              type="button"
              onClick={onOpenAlertsWidget}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border border-border/80 bg-card hover:bg-accent text-foreground transition-all shadow-2xs"
            >
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span>Alerts Widget</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
