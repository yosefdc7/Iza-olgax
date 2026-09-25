"use client";

import { Printer } from "lucide-react";

interface Props {
  productName?: string;
  variant?: "default" | "compact";
  className?: string;
}

export function ProductPrintHistoryButton({
  productName,
  variant = "default",
  className = "",
}: Props) {
  const handlePrint = () => {
    // Small delay ensures any focus state settles and print styles apply cleanly
    setTimeout(() => {
      window.print();
    }, 50);
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handlePrint}
        data-testid="print-stock-history-compact-button"
        aria-label={productName ? `Print stock adjustment history for ${productName}` : "Print stock history report"}
        title="Print stock adjustment history PDF report"
        className={`inline-flex items-center gap-1.5 border border-border bg-background hover:bg-muted text-foreground px-2.5 py-1 rounded-md text-xs font-medium shadow-2xs transition-colors cursor-pointer ${className}`}
      >
        <Printer className="h-3 w-3 text-muted-foreground" />
        <span>Print Report</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      data-testid="print-stock-history-button"
      aria-label={productName ? `Print stock adjustment history for ${productName}` : "Print stock history report"}
      title="Print PDF report of stock adjustment history"
      className={`inline-flex items-center gap-2 border border-border bg-background text-foreground hover:bg-muted px-3 py-1.5 rounded-md text-sm font-medium shadow-2xs transition-colors cursor-pointer ${className}`}
    >
      <Printer className="h-3.5 w-3.5 text-muted-foreground" />
      <span>Print Stock History</span>
    </button>
  );
}
