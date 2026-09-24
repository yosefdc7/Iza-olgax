import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  shouldNotifyStockLevel,
  clearNotifiedStockHistory,
  formatStockAlertDetails,
  processAutomatedStockAlerts,
  type StockAlertPayload,
} from "@/lib/stock-notifications";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Automated Stock Notification System & Banner Logic", () => {
  beforeEach(() => {
    clearNotifiedStockHistory();
    vi.clearAllMocks();
  });

  describe("shouldNotifyStockLevel", () => {
    it("returns false when product stock is strictly above defined low-stock threshold", () => {
      expect(shouldNotifyStockLevel("prod-1", 15, 10)).toBe(false);
      expect(shouldNotifyStockLevel("prod-2", 10.1, 10)).toBe(false);
    });

    it("returns true when product stock drops to or below threshold for the first time", () => {
      // Stock equal to threshold is a breach
      expect(shouldNotifyStockLevel("prod-1", 10, 10)).toBe(true);
      // Stock strictly below threshold is a breach
      expect(shouldNotifyStockLevel("prod-2", 4, 10)).toBe(true);
      // Zero stock (out of stock) is a critical breach
      expect(shouldNotifyStockLevel("prod-3", 0, 5)).toBe(true);
    });

    it("prevents duplicate spam notifications for unchanged stock level", () => {
      const item: StockAlertPayload = {
        id: "prod-repeat",
        name: "Whole Milk",
        stock: 3,
        lowStockThreshold: 10,
        unit: "L",
      };

      // First run: should alert
      const firstRun = processAutomatedStockAlerts([item]);
      expect(firstRun).toHaveLength(1);
      expect(firstRun[0].id).toBe("prod-repeat");

      // Second run at same stock level (3): should NOT alert again
      const secondRun = processAutomatedStockAlerts([item]);
      expect(secondRun).toHaveLength(0);
    });

    it("re-alerts when a product stock drops to an even lower level below threshold", () => {
      const itemDrop1: StockAlertPayload = {
        id: "prod-re-alert",
        name: "Ground Coffee",
        stock: 5,
        lowStockThreshold: 10,
        unit: "kg",
      };

      // Initial breach at stock = 5
      expect(shouldNotifyStockLevel(itemDrop1.id, itemDrop1.stock, itemDrop1.lowStockThreshold)).toBe(true);
      processAutomatedStockAlerts([itemDrop1]);

      // Stock drops further to 2
      const itemDrop2: StockAlertPayload = {
        ...itemDrop1,
        stock: 2,
      };
      expect(shouldNotifyStockLevel(itemDrop2.id, itemDrop2.stock, itemDrop2.lowStockThreshold)).toBe(true);

      // Stock drops to 0 (out of stock)
      const itemDrop3: StockAlertPayload = {
        ...itemDrop1,
        stock: 0,
      };
      expect(shouldNotifyStockLevel(itemDrop3.id, itemDrop3.stock, itemDrop3.lowStockThreshold)).toBe(true);
    });

    it("re-arms alerts when a product is replenished above threshold and drops again later", () => {
      const productId = "prod-restock";
      const threshold = 10;

      // 1. Initial drop below threshold
      expect(shouldNotifyStockLevel(productId, 4, threshold)).toBe(true);
      processAutomatedStockAlerts([{ id: productId, name: "Juice", stock: 4, lowStockThreshold: threshold }]);

      // 2. Restocked above threshold (e.g. 25 units)
      expect(shouldNotifyStockLevel(productId, 25, threshold)).toBe(false);

      // 3. Stock drops below threshold again (e.g. 4 units again) -> should alert!
      expect(shouldNotifyStockLevel(productId, 4, threshold)).toBe(true);
    });
  });

  describe("formatStockAlertDetails", () => {
    it("formats out-of-stock items with critical error severity and 0 count", () => {
      const alert = formatStockAlertDetails({
        id: "prod-zero",
        name: "Avocado",
        stock: 0,
        lowStockThreshold: 10,
        unit: "pcs",
      });

      expect(alert.isOutOfStock).toBe(true);
      expect(alert.title).toContain("🚨 Out of Stock: Avocado");
      expect(alert.description).toContain("Stock level has dropped to 0 pcs");
      expect(alert.description).toContain("Defined threshold is 10 pcs");
    });

    it("formats low-stock items with warning severity and remaining count", () => {
      const alert = formatStockAlertDetails({
        id: "prod-low",
        name: "Sugar Syrup",
        stock: 2.5,
        lowStockThreshold: 5,
        unit: "L",
      });

      expect(alert.isOutOfStock).toBe(false);
      expect(alert.title).toContain("⚠️ Low Stock Alert: Sugar Syrup");
      expect(alert.description).toContain("Stock has dropped to 2.5 L");
      expect(alert.description).toContain("threshold of 5 L");
    });

    it("handles items without explicit unit cleanly", () => {
      const alert = formatStockAlertDetails({
        id: "prod-nounit",
        name: "Paper Cups",
        stock: 3,
        lowStockThreshold: 10,
      });

      expect(alert.title).toBe("⚠️ Low Stock Alert: Paper Cups");
      expect(alert.description).toContain("Stock has dropped to 3 (at or below threshold of 10)");
    });
  });

  describe("processAutomatedStockAlerts", () => {
    it("processes mixed batches of normal, low-stock, and out-of-stock products", () => {
      const batch: StockAlertPayload[] = [
        { id: "p1", name: "Croissant", stock: 20, lowStockThreshold: 10, unit: "pc" }, // Normal
        { id: "p2", name: "Baguette", stock: 5, lowStockThreshold: 10, unit: "pc" },   // Low Stock
        { id: "p3", name: "Donut", stock: 0, lowStockThreshold: 10, unit: "pc" },       // Out of Stock
      ];

      const alerted = processAutomatedStockAlerts(batch);
      expect(alerted).toHaveLength(2);
      expect(alerted.map((a) => a.id)).toEqual(["p2", "p3"]);
    });
  });
});
