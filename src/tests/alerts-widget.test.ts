import { describe, it, expect } from "vitest";
import {
  filterLowStockProducts,
  calculateStockSummary,
  type StockAlertProduct,
} from "@/lib/stock-alerts";

describe("Alerts Widget Logic & Deficit Computation", () => {
  const sampleProducts: StockAlertProduct[] = [
    {
      id: "prod-healthy",
      name: "Standard Sugar",
      stock: 50,
      lowStockThreshold: 10,
      unit: "kg",
      price: 65,
      category: "Baking",
    },
    {
      id: "prod-low-1",
      name: "Arabica Coffee Beans",
      stock: 4,
      lowStockThreshold: 10,
      unit: "kg",
      price: 850,
      category: "Coffee",
      sku: "CF-ARB-01",
    },
    {
      id: "prod-zero",
      name: "Fresh Whole Milk",
      stock: 0,
      lowStockThreshold: 12,
      unit: "carton",
      price: 110,
      category: "Dairy",
      sku: "DRY-MLK-01",
    },
    {
      id: "prod-low-2",
      name: "Matcha Powder",
      stock: 2,
      lowStockThreshold: 5,
      unit: "tin",
      price: 650,
      category: "Tea",
    },
    {
      id: "prod-exact-threshold",
      name: "Paper Cups 12oz",
      stock: 100,
      lowStockThreshold: 100,
      unit: "pack",
      price: 150,
      category: "Supplies",
    },
  ];

  it("filters out healthy products and only includes products at or below low stock threshold", () => {
    const alerts = filterLowStockProducts(sampleProducts);

    // prod-healthy (50 > 10) must NOT be included
    expect(alerts.find((a) => a.id === "prod-healthy")).toBeUndefined();

    // All others are <= threshold
    expect(alerts).toHaveLength(4);
    expect(alerts.map((a) => a.id)).toContain("prod-zero");
    expect(alerts.map((a) => a.id)).toContain("prod-low-1");
    expect(alerts.map((a) => a.id)).toContain("prod-low-2");
    expect(alerts.map((a) => a.id)).toContain("prod-exact-threshold");
  });

  it("sorts out-of-stock products first, followed by lowest remaining stock", () => {
    const alerts = filterLowStockProducts(sampleProducts);

    // 0 stock should be first
    expect(alerts[0].id).toBe("prod-zero");
    expect(alerts[0].status).toBe("OUT_OF_STOCK");

    // Next is stock: 2
    expect(alerts[1].id).toBe("prod-low-2");
    expect(alerts[1].status).toBe("LOW_STOCK");

    // Next is stock: 4
    expect(alerts[2].id).toBe("prod-low-1");

    // Last is stock: 100
    expect(alerts[3].id).toBe("prod-exact-threshold");
  });

  it("accurately calculates shortage deficit and percentage remaining for each product", () => {
    const alerts = filterLowStockProducts(sampleProducts);

    const zero = alerts.find((a) => a.id === "prod-zero")!;
    expect(zero.deficit).toBe(12); // 12 - 0 = 12
    expect(zero.percentageRemaining).toBe(0);

    const matcha = alerts.find((a) => a.id === "prod-low-2")!;
    expect(matcha.deficit).toBe(3); // 5 - 2 = 3
    expect(matcha.percentageRemaining).toBe(40); // 2/5 * 100 = 40%

    const coffee = alerts.find((a) => a.id === "prod-low-1")!;
    expect(coffee.deficit).toBe(6); // 10 - 4 = 6
    expect(coffee.percentageRemaining).toBe(40); // 4/10 * 100 = 40%

    const cups = alerts.find((a) => a.id === "prod-exact-threshold")!;
    expect(cups.deficit).toBe(0); // 100 - 100 = 0
    expect(cups.percentageRemaining).toBe(100);
  });

  it("calculates accurate summary statistics for the widget header", () => {
    const summary = calculateStockSummary(sampleProducts);

    expect(summary.totalProducts).toBe(5);
    expect(summary.totalBelowThreshold).toBe(4);
    expect(summary.outOfStockCount).toBe(1);
    expect(summary.lowStockCount).toBe(3);
    expect(summary.hasCriticalStock).toBe(true);
  });

  it("handles completely healthy inventory with 0 alerts", () => {
    const healthyCatalog: StockAlertProduct[] = [
      { id: "1", name: "Item A", stock: 20, lowStockThreshold: 5, unit: "pc", price: 10 },
      { id: "2", name: "Item B", stock: 100, lowStockThreshold: 20, unit: "pc", price: 25 },
    ];

    const alerts = filterLowStockProducts(healthyCatalog);
    const summary = calculateStockSummary(healthyCatalog);

    expect(alerts).toHaveLength(0);
    expect(summary.totalBelowThreshold).toBe(0);
    expect(summary.outOfStockCount).toBe(0);
    expect(summary.lowStockCount).toBe(0);
    expect(summary.hasCriticalStock).toBe(false);
  });
});
