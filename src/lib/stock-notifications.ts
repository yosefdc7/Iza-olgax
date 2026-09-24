import { toast } from "sonner";
import { isProductBelowThreshold } from "@/lib/stock-alerts";

export interface StockAlertPayload {
  id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  unit?: string;
  isOutOfStock?: boolean;
}

// In-memory session tracking of last notified stock level per product
// This prevents duplicate toast spam while ensuring new stock drops trigger notifications
const notifiedStockLevels = new Map<string, number>();

/**
 * Resets notification history (useful in tests or when user manually clears)
 */
export function clearNotifiedStockHistory(): void {
  notifiedStockLevels.clear();
}

/**
 * Determines if a product's current stock level represents a new breach or a further drop
 * that requires an automated notification.
 */
export function shouldNotifyStockLevel(productId: string, currentStock: number, threshold: number): boolean {
  if (!isProductBelowThreshold(currentStock, threshold)) {
    // If replenished above threshold, remove from tracking so future drops trigger anew
    notifiedStockLevels.delete(productId);
    return false;
  }

  const lastNotified = notifiedStockLevels.get(productId);

  // If never notified, notify now
  if (lastNotified === undefined) {
    return true;
  }

  // If stock has dropped even lower than when we previously alerted, notify again
  if (currentStock < lastNotified) {
    return true;
  }

  return false;
}

/**
 * Formats a user-friendly notification message and severity for a low-stock breach.
 */
export function formatStockAlertDetails(item: StockAlertPayload): {
  title: string;
  description: string;
  isOutOfStock: boolean;
} {
  const isOutOfStock = item.stock <= 0 || !!item.isOutOfStock;
  const unitStr = item.unit ? ` ${item.unit}` : "";

  if (isOutOfStock) {
    return {
      title: `🚨 Out of Stock: ${item.name}`,
      description: `Stock level has dropped to 0${unitStr}. Defined threshold is ${item.lowStockThreshold}${unitStr}. Immediate replenishment required.`,
      isOutOfStock: true,
    };
  }

  return {
    title: `⚠️ Low Stock Alert: ${item.name}`,
    description: `Stock has dropped to ${item.stock}${unitStr} (at or below threshold of ${item.lowStockThreshold}${unitStr}).`,
    isOutOfStock: false,
  };
}

/**
 * Triggers an automated in-app toast notification for a single item that breached its low-stock threshold.
 */
export function notifySingleStockBreach(item: StockAlertPayload, onNavigate?: () => void): void {
  const { title, description, isOutOfStock } = formatStockAlertDetails(item);

  // Mark as notified at this stock level
  notifiedStockLevels.set(item.id, item.stock);

  if (isOutOfStock) {
    toast.error(title, {
      description,
      duration: 8000,
      action: onNavigate
        ? {
            label: "Catalog",
            onClick: onNavigate,
          }
        : undefined,
    });
  } else {
    toast.warning(title, {
      description,
      duration: 6000,
      action: onNavigate
        ? {
            label: "Catalog",
            onClick: onNavigate,
          }
        : undefined,
    });
  }
}

/**
 * Processes a batch of low-stock alert items and emits automated in-app notifications
 * for any items that have just breached or dropped further.
 */
export function processAutomatedStockAlerts(
  items: StockAlertPayload[],
  onNavigate?: () => void
): StockAlertPayload[] {
  const newlyAlerted: StockAlertPayload[] = [];

  for (const item of items) {
    if (shouldNotifyStockLevel(item.id, item.stock, item.lowStockThreshold)) {
      notifySingleStockBreach(item, onNavigate);
      newlyAlerted.push(item);
    }
  }

  return newlyAlerted;
}
