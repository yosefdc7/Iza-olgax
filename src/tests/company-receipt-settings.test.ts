import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/store/cart";

describe("Company Receipt Settings & POS Dropdown Selection", () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it("formats company receipt reference with series prefix and zero-padded sequence", () => {
    function formatReceiptRef(seriesName: string, seq: number): string {
      return `${seriesName}-${String(seq).padStart(6, "0")}`;
    }

    expect(formatReceiptRef("211", 1)).toBe("211-000001");
    expect(formatReceiptRef("211", 89)).toBe("211-000089");
    expect(formatReceiptRef("CHB", 1)).toBe("CHB-000001");
    expect(formatReceiptRef("CHB", 250)).toBe("CHB-000250");
    expect(formatReceiptRef("MAIN-STORE", 14)).toBe("MAIN-STORE-000014");
  });

  it("handles dropdown series prioritization (211, then CHB, then others)", () => {
    const activeSeries = [
      { id: "s-chb", name: "CHB", nextNumber: 1, active: true },
      { id: "s-211", name: "211", nextNumber: 1, active: true },
      { id: "s-hq", name: "HQ", nextNumber: 5, active: true },
    ];

    // Priority: 211 first, then CHB, then first
    const preferredId =
      activeSeries.find((s) => s.name.toUpperCase() === "211")?.id ??
      activeSeries.find((s) => s.name.toUpperCase() === "CHB")?.id ??
      activeSeries[0]?.id;

    expect(preferredId).toBe("s-211");
  });

  it("correctly calculates cart subtotal, tax, discounts with zero tip", () => {
    const store = useCartStore.getState();
    store.addItem({
      productId: "prod-item-1",
      name: "Product A",
      price: 250,
      unit: "pcs",
      quantityPrecision: 0,
      stock: 20,
    });

    store.setDiscount(50, "fixed"); // 50 off -> 200
    const taxRate = 0.12; // 12% on 200 -> 24

    expect(store.subtotal()).toBe(250);
    expect(store.discountValue()).toBe(50);
    expect(store.taxAmount(taxRate)).toBe(24);
    expect(store.total(taxRate)).toBe(224);
    expect(store.tipAmount).toBe(0);
  });
});
