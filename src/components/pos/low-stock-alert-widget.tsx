"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockAlertSummary } from "@/lib/stock-alerts";
import { AlertsWidget } from "@/components/dashboard/alerts-widget";

interface LowStockAlertWidgetProps {
  className?: string;
  onFilterInPos?: (productName: string) => void;
}

export function LowStockAlertWidget({ className, onFilterInPos }: LowStockAlertWidgetProps) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<StockAlertSummary>({
    totalProducts: 0,
    totalBelowThreshold: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    hasCriticalStock: false,
  });

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/products/low-stock", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn("[LowStockAlertWidget] Failed to fetch stock summary", err);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    const handleStockChange = () => fetchSummary();
    window.addEventListener("pos:stock-changed", handleStockChange);
    window.addEventListener("focus", handleStockChange);

    const interval = setInterval(fetchSummary, 30000);
    return () => {
      window.removeEventListener("pos:stock-changed", handleStockChange);
      window.removeEventListener("focus", handleStockChange);
      clearInterval(interval);
    };
  }, [fetchSummary]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const hasAlerts = summary.totalBelowThreshold > 0;
  const isSevere = summary.outOfStockCount > 0;

  return (
    <>
      {/* Trigger Button in Header / Navigation */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Low Stock Alerts"
        title={
          hasAlerts
            ? `${summary.totalBelowThreshold} item(s) below defined low-stock threshold`
            : "All products stocked above threshold"
        }
        className={cn(
          "relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all select-none",
          hasAlerts
            ? isSevere
              ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 active:scale-95"
              : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95"
            : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40",
          className
        )}
      >
        {isSevere ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive animate-pulse" />
        ) : (
          <AlertTriangle
            className={cn(
              "h-4 w-4 shrink-0",
              hasAlerts ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            )}
          />
        )}

        <span className="hidden sm:inline">
          {hasAlerts ? `${summary.totalBelowThreshold} Low Stock` : "Stock OK"}
        </span>

        {hasAlerts && (
          <span
            className={cn(
              "inline-flex h-4 min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
              isSevere
                ? "bg-destructive text-destructive-foreground"
                : "bg-amber-600 text-white dark:bg-amber-500 dark:text-amber-950"
            )}
          >
            {summary.totalBelowThreshold}
          </span>
        )}
      </button>

      {/* Modal Drawer displaying unified AlertsWidget */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="low-stock-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
        >
          {/* Backdrop Dismiss */}
          <div className="absolute inset-0" onClick={() => setOpen(false)} />

          {/* Dialog Container */}
          <div className="relative z-10 flex flex-col w-full max-w-4xl max-h-[90vh] bg-card border border-border/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5 bg-muted/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h2 id="low-stock-modal-title" className="text-sm font-bold text-foreground">
                  Inventory Low-Stock Alerts
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <AlertsWidget
                variant="dashboard"
                title="Stock Threshold Alerts"
                onSelectProduct={
                  onFilterInPos
                    ? (item) => {
                        onFilterInPos(item.name);
                        setOpen(false);
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
