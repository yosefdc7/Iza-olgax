export interface StockAlertProduct {
  id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  price: number;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  imageUrl?: string | null;
}

export type StockStatus = "OUT_OF_STOCK" | "LOW_STOCK" | "NORMAL";

export interface LowStockAlertItem extends StockAlertProduct {
  status: StockStatus;
  deficit: number;
  percentageRemaining: number;
}

export interface StockAlertSummary {
  totalProducts: number;
  totalBelowThreshold: number;
  outOfStockCount: number;
  lowStockCount: number;
  hasCriticalStock: boolean;
}

/**
 * Returns true if the product stock is at or below its defined threshold.
 */
export function isProductBelowThreshold(stock: number, lowStockThreshold: number): boolean {
  return stock <= lowStockThreshold;
}

/**
 * Categorizes product stock into OUT_OF_STOCK (<=0), LOW_STOCK (<=threshold), or NORMAL (>threshold).
 */
export function categorizeStockStatus(stock: number, lowStockThreshold: number): StockStatus {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock <= lowStockThreshold) return "LOW_STOCK";
  return "NORMAL";
}

/**
 * Filters a list of products to only those below their low-stock threshold,
 * annotates with deficit and status, and sorts out-of-stock items first,
 * followed by lowest stock items.
 */
export function filterLowStockProducts(products: StockAlertProduct[]): LowStockAlertItem[] {
  return products
    .filter((p) => isProductBelowThreshold(p.stock, p.lowStockThreshold))
    .map((p) => {
      const status = categorizeStockStatus(p.stock, p.lowStockThreshold);
      const deficit = Math.max(0, p.lowStockThreshold - p.stock);
      const percentageRemaining =
        p.lowStockThreshold > 0
          ? Math.max(0, Math.min(100, Math.round((p.stock / p.lowStockThreshold) * 100)))
          : p.stock > 0
            ? 100
            : 0;

      return {
        ...p,
        status,
        deficit,
        percentageRemaining,
      };
    })
    .sort((a, b) => {
      // 1. Out of stock first
      if (a.stock <= 0 && b.stock > 0) return -1;
      if (b.stock <= 0 && a.stock > 0) return 1;
      // 2. Lowest stock count first
      if (a.stock !== b.stock) return a.stock - b.stock;
      // 3. Alphabetical name tie-breaker
      return a.name.localeCompare(b.name);
    });
}

/**
 * Computes aggregated stock summary metrics.
 */
export function calculateStockSummary(
  products: Array<{ stock: number; lowStockThreshold: number }>
): StockAlertSummary {
  let outOfStockCount = 0;
  let lowStockCount = 0;

  for (const p of products) {
    if (p.stock <= 0) {
      outOfStockCount += 1;
    } else if (p.stock <= p.lowStockThreshold) {
      lowStockCount += 1;
    }
  }

  const totalBelowThreshold = outOfStockCount + lowStockCount;

  return {
    totalProducts: products.length,
    totalBelowThreshold,
    outOfStockCount,
    lowStockCount,
    hasCriticalStock: totalBelowThreshold > 0,
  };
}
