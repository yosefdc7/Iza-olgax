"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { processAutomatedStockAlerts, type StockAlertPayload } from "@/lib/stock-notifications";

export function StockNotificationListener() {
  const router = useRouter();
  const initialFetchDone = useRef(false);

  useEffect(() => {
    const handleNavigate = () => {
      router.push("/products");
    };

    // 1. Listen for immediate client-side events triggered after sales or adjustments
    const handleStockChangedEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ lowStockAlerts?: StockAlertPayload[] }>;
      const alerts = customEvent.detail?.lowStockAlerts;
      if (Array.isArray(alerts) && alerts.length > 0) {
        processAutomatedStockAlerts(alerts, handleNavigate);
      }
    };

    window.addEventListener("pos:stock-changed", handleStockChangedEvent);

    // 2. Automated background checker: polls /api/products/low-stock to detect background / multi-device drops
    async function checkLowStockAlerts() {
      try {
        const res = await fetch("/api/products/low-stock", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const items: StockAlertPayload[] = (data.items ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold,
          unit: p.unit,
          isOutOfStock: p.stock <= 0,
        }));

        if (items.length > 0) {
          processAutomatedStockAlerts(items, handleNavigate);
        }
      } catch {
        // Best effort background check
      }
    }

    // Delay initial check slightly so the app mounts cleanly without layout shift
    const initialTimer = setTimeout(() => {
      if (!initialFetchDone.current) {
        initialFetchDone.current = true;
        checkLowStockAlerts();
      }
    }, 2000);

    // Periodic automated check every 25 seconds
    const interval = setInterval(checkLowStockAlerts, 25000);

    // Also check when tab regains focus
    const handleFocus = () => checkLowStockAlerts();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("pos:stock-changed", handleStockChangedEvent);
      window.removeEventListener("focus", handleFocus);
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
