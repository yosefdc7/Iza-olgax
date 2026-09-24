import { describe, it, expect } from "vitest";
import {
  isProductBelowThreshold,
  categorizeStockStatus,
  filterLowStockProducts,
  calculateStockSummary,
  type StockAlertProduct,
} from "@/lib/stock-alerts";

describe("Stock Alerts Flow & Edge Cases", () => {
  it("correctly identifies stock exactly matching defined threshold as low stock", () => {
    expect(isProductBelowThreshold(5, 5)).toBe(true);
    expect(categorizeStockStatus(5, 5)).toBe("LOW_STOCK");
  });

  it("handles negative stock levels (oversold items) as OUT_OF_STOCK with correct deficit", () => {
    const products: StockAlertProduct[] = [
      {
        id: "prod-oversold",
        name: "Oversold Item",
        stock: -3,
        lowStockThreshold: 10,
        unit: "pc",
        price: 50,
      },
    ];

    const results = filterLowStockProducts(products);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("OUT_OF_STOCK");
    expect(results[0].deficit).toBe(13); // 10 - (-3) = 13 needed to meet threshold
    expect(results[0].percentageRemaining).toBe(0);
  });

  it("handles fractional/decimal units (e.g. coffee beans in kg, liquids in L)", () => {
    const products: StockAlertProduct[] = [
      {
        id: "prod-coffee",
        name: "Arabica Beans",
        stock: 1.25,
        lowStockThreshold: 2.5,
        unit: "kg",
        price: 900,
      },
      {
        id: "prod-syrup",
        name: "Hazelnut Syrup",
        stock: 2.501,
        lowStockThreshold: 2.5,
        unit: "L",
        price: 450,
      },
    ];

    const alerts = filterLowStockProducts(products);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe("prod-coffee");
    expect(alerts[0].deficit).toBeCloseTo(1.25);
    expect(alerts[0].percentageRemaining).toBe(50);
  });

  it("handles zero threshold products accurately", () => {
    const products: StockAlertProduct[] = [
      {
        id: "prod-zero-thresh-1",
        name: "Digital Code (no stock tracked)",
        stock: 0,
        lowStockThreshold: 0,
        unit: "code",
        price: 100,
      },
      {
        id: "prod-zero-thresh-2",
        name: "Digital Voucher",
        stock: 5,
        lowStockThreshold: 0,
        unit: "voucher",
        price: 200,
      },
    ];

    const alerts = filterLowStockProducts(products);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe("prod-zero-thresh-1");
    expect(alerts[0].status).toBe("OUT_OF_STOCK");
  });

  it("simulates a sale reducing stock below threshold and alerting", () => {
    // Product initially above threshold
    const initialProduct: StockAlertProduct = {
      id: "prod-sandwich",
      name: "Club Sandwich",
      stock: 7,
      lowStockThreshold: 5,
      unit: "pc",
      price: 150,
    };

    expect(isProductBelowThreshold(initialProduct.stock, initialProduct.lowStockThreshold)).toBe(false);

    // Customer buys 3 sandwiches
    const quantitySold = 3;
    const postSaleStock = initialProduct.stock - quantitySold; // 4

    expect(postSaleStock).toBe(4);
    expect(isProductBelowThreshold(postSaleStock, initialProduct.lowStockThreshold)).toBe(true);
    expect(categorizeStockStatus(postSaleStock, initialProduct.lowStockThreshold)).toBe("LOW_STOCK");

    const updatedProduct = { ...initialProduct, stock: postSaleStock };
    const alerts = filterLowStockProducts([updatedProduct]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].deficit).toBe(1); // 5 - 4 = 1 needed
  });

  it("simulates multiple items sold where one goes out of stock and another low stock", () => {
    const catalog: StockAlertProduct[] = [
      { id: "item-a", name: "Croissant", stock: 2, lowStockThreshold: 5, unit: "pc", price: 65 },
      { id: "item-b", name: "Muffin", stock: 1, lowStockThreshold: 5, unit: "pc", price: 55 },
      { id: "item-c", name: "Juice", stock: 20, lowStockThreshold: 5, unit: "bottle", price: 80 },
    ];

    // Sale: 2 Croissants, 1 Muffin
    const sold = [
      { id: "item-a", qty: 2 },
      { id: "item-b", qty: 1 },
    ];

    const updatedCatalog = catalog.map((item) => {
      const sale = sold.find((s) => s.id === item.id);
      return sale ? { ...item, stock: item.stock - sale.qty } : item;
    });

    const summary = calculateStockSummary(updatedCatalog);
    expect(summary.totalProducts).toBe(3);
    expect(summary.totalBelowThreshold).toBe(2);
    expect(summary.outOfStockCount).toBe(2);
    expect(summary.lowStockCount).toBe(0);
    expect(summary.hasCriticalStock).toBe(true);

    const alerts = filterLowStockProducts(updatedCatalog);
    expect(alerts.map((a) => a.id)).toEqual(["item-a", "item-b"]);
  });
});
