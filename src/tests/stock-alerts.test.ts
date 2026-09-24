import { describe, it, expect } from "vitest";
import {
  isProductBelowThreshold,
  categorizeStockStatus,
  filterLowStockProducts,
  calculateStockSummary,
  type StockAlertProduct,
} from "@/lib/stock-alerts";

describe("stock-alerts utility", () => {
  describe("isProductBelowThreshold", () => {
    it("returns true when stock is equal to threshold", () => {
      expect(isProductBelowThreshold(5, 5)).toBe(true);
    });

    it("returns true when stock is strictly less than threshold", () => {
      expect(isProductBelowThreshold(3, 5)).toBe(true);
      expect(isProductBelowThreshold(0, 5)).toBe(true);
      expect(isProductBelowThreshold(-1, 5)).toBe(true);
    });

    it("returns false when stock is greater than threshold", () => {
      expect(isProductBelowThreshold(6, 5)).toBe(false);
      expect(isProductBelowThreshold(100, 10)).toBe(false);
    });

    it("handles decimal values accurately", () => {
      expect(isProductBelowThreshold(2.5, 3)).toBe(true);
      expect(isProductBelowThreshold(3.001, 3)).toBe(false);
    });
  });

  describe("categorizeStockStatus", () => {
    it("categorizes zero or negative stock as OUT_OF_STOCK", () => {
      expect(categorizeStockStatus(0, 5)).toBe("OUT_OF_STOCK");
      expect(categorizeStockStatus(-2, 5)).toBe("OUT_OF_STOCK");
    });

    it("categorizes positive stock at or below threshold as LOW_STOCK", () => {
      expect(categorizeStockStatus(1, 5)).toBe("LOW_STOCK");
      expect(categorizeStockStatus(5, 5)).toBe("LOW_STOCK");
      expect(categorizeStockStatus(0.5, 1)).toBe("LOW_STOCK");
    });

    it("categorizes stock above threshold as NORMAL", () => {
      expect(categorizeStockStatus(6, 5)).toBe("NORMAL");
      expect(categorizeStockStatus(10, 5)).toBe("NORMAL");
    });
  });

  describe("filterLowStockProducts", () => {
    const products: StockAlertProduct[] = [
      {
        id: "p1",
        name: "Espresso Beans",
        stock: 0,
        lowStockThreshold: 10,
        unit: "kg",
        price: 850,
      },
      {
        id: "p2",
        name: "Whole Milk",
        stock: 3,
        lowStockThreshold: 12,
        unit: "L",
        price: 95,
      },
      {
        id: "p3",
        name: "Paper Cups",
        stock: 50,
        lowStockThreshold: 20,
        unit: "pc",
        price: 5,
      },
      {
        id: "p4",
        name: "Vanilla Syrup",
        stock: 5,
        lowStockThreshold: 5,
        unit: "bottle",
        price: 450,
      },
    ];

    it("filters only products at or below their defined lowStockThreshold", () => {
      const lowStockItems = filterLowStockProducts(products);
      expect(lowStockItems.map((p) => p.id)).toEqual(["p1", "p2", "p4"]);
      expect(lowStockItems.find((p) => p.id === "p3")).toBeUndefined();
    });

    it("sorts out-of-stock items first, then by ascending stock count", () => {
      const lowStockItems = filterLowStockProducts(products);
      expect(lowStockItems[0].id).toBe("p1"); // stock 0
      expect(lowStockItems[1].id).toBe("p2"); // stock 3
      expect(lowStockItems[2].id).toBe("p4"); // stock 5
    });

    it("calculates deficit correctly for each product", () => {
      const lowStockItems = filterLowStockProducts(products);
      const p1 = lowStockItems.find((p) => p.id === "p1")!;
      const p2 = lowStockItems.find((p) => p.id === "p2")!;
      const p4 = lowStockItems.find((p) => p.id === "p4")!;

      expect(p1.deficit).toBe(10);
      expect(p2.deficit).toBe(9);
      expect(p4.deficit).toBe(0); // at threshold, deficit is 0
    });
  });

  describe("calculateStockSummary", () => {
    it("returns zero counts for an empty product list", () => {
      const summary = calculateStockSummary([]);
      expect(summary).toEqual({
        totalProducts: 0,
        totalBelowThreshold: 0,
        outOfStockCount: 0,
        lowStockCount: 0,
        hasCriticalStock: false,
      });
    });

    it("aggregates out-of-stock and low-stock product metrics correctly", () => {
      const sample = [
        { stock: 0, lowStockThreshold: 5 },
        { stock: -1, lowStockThreshold: 5 },
        { stock: 2, lowStockThreshold: 4 },
        { stock: 4, lowStockThreshold: 4 },
        { stock: 15, lowStockThreshold: 10 },
      ];

      const summary = calculateStockSummary(sample);
      expect(summary.totalProducts).toBe(5);
      expect(summary.totalBelowThreshold).toBe(4);
      expect(summary.outOfStockCount).toBe(2);
      expect(summary.lowStockCount).toBe(2);
      expect(summary.hasCriticalStock).toBe(true);
    });

    it("flags hasCriticalStock as true if any item is out of stock or below threshold", () => {
      expect(calculateStockSummary([{ stock: 2, lowStockThreshold: 5 }]).hasCriticalStock).toBe(true);
      expect(calculateStockSummary([{ stock: 10, lowStockThreshold: 5 }]).hasCriticalStock).toBe(false);
    });
  });
});
