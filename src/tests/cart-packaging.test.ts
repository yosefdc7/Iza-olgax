import { describe, it, expect, beforeEach } from "vitest";
import { cartSubtotal, cartAddItem, cartUpdateQuantity, makeCartItem } from "@/lib/cart-helpers";
import type { CartItem } from "@/store/cart";

// ─── helpers ─────────────────────────────────────────────────────────────────
// We test the pure cart calculation helpers extracted from the store
// (cartSubtotal, cartAddItem, cartUpdateQuantity, makeCartItem)
// so tests have no Zustand/localStorage dependency.

const BASE_NAIL: Omit<CartItem, "quantity" | "notes"> = {
  productId: "prod-nail",
  name: "Nail",
  price: 5,
  stock: 200,
  unit: "pc",
  quantityPrecision: 0,
};

const BOX_NAIL: Omit<CartItem, "quantity" | "notes"> = {
  productId: "prod-nail",
  name: "Nail",
  price: 300,
  stock: 200,
  unit: "pc",
  quantityPrecision: 0,
  packagingId: "pkg-box-100",
  packagingName: "Box of 100",
  packagingQty: 100,
};

// ─── makeCartItem ─────────────────────────────────────────────────────────────

describe("makeCartItem", () => {
  it("creates a base unit cart item with quantity 1 and empty notes", () => {
    const item = makeCartItem(BASE_NAIL);
    expect(item.quantity).toBe(1);
    expect(item.notes).toBe("");
    expect(item.packagingId).toBeUndefined();
  });

  it("creates a packaging cart item preserving packaging fields", () => {
    const item = makeCartItem(BOX_NAIL);
    expect(item.packagingId).toBe("pkg-box-100");
    expect(item.packagingName).toBe("Box of 100");
    expect(item.packagingQty).toBe(100);
    expect(item.quantity).toBe(1);
  });
});

// ─── cartAddItem ──────────────────────────────────────────────────────────────

describe("cartAddItem", () => {
  it("adds a new base unit item to an empty cart", () => {
    const cart = cartAddItem([], BASE_NAIL);
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
    expect(cart[0].productId).toBe("prod-nail");
  });

  it("increments quantity when the same base item is added again", () => {
    const cart = cartAddItem([makeCartItem(BASE_NAIL)], BASE_NAIL);
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it("adds packaging item as separate cart entry from base unit item", () => {
    const withBase = cartAddItem([], BASE_NAIL);
    const withBoth = cartAddItem(withBase, BOX_NAIL);
    expect(withBoth).toHaveLength(2);
  });

  it("increments packaging item quantity when same packaging added again", () => {
    const cart = cartAddItem([makeCartItem(BOX_NAIL)], BOX_NAIL);
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it("uses packaging price (₱300) not base price (₱5) for packaged item", () => {
    const cart = cartAddItem([], BOX_NAIL);
    expect(cart[0].price).toBe(300);
  });
});

// ─── cartSubtotal ─────────────────────────────────────────────────────────────

describe("cartSubtotal", () => {
  it("calculates subtotal from a single base unit item", () => {
    const cart = [makeCartItem(BASE_NAIL)];
    expect(cartSubtotal(cart)).toBe(5);
  });

  it("calculates subtotal for mixed base + packaging items", () => {
    // 2 nails at ₱5 = ₱10 + 1 box at ₱300 = ₱310
    const baseItem = { ...makeCartItem(BASE_NAIL), quantity: 2 };
    const boxItem = makeCartItem(BOX_NAIL);
    expect(cartSubtotal([baseItem, boxItem])).toBe(310);
  });

  it("returns 0 for empty cart", () => {
    expect(cartSubtotal([])).toBe(0);
  });
});

// ─── cartUpdateQuantity ───────────────────────────────────────────────────────

describe("cartUpdateQuantity", () => {
  it("updates quantity of a packaging item by its cart key", () => {
    const cart = [makeCartItem(BOX_NAIL)];
    const cartKey = "prod-nail::pkg-box-100";
    const updated = cartUpdateQuantity(cart, cartKey, 3);
    expect(updated[0].quantity).toBe(3);
  });

  it("removes item when quantity set to 0", () => {
    const cart = [makeCartItem(BOX_NAIL)];
    const cartKey = "prod-nail::pkg-box-100";
    const updated = cartUpdateQuantity(cart, cartKey, 0);
    expect(updated).toHaveLength(0);
  });

  it("updates quantity of base unit item by its cart key", () => {
    const cart = [makeCartItem(BASE_NAIL)];
    const cartKey = "prod-nail::base";
    const updated = cartUpdateQuantity(cart, cartKey, 5);
    expect(updated[0].quantity).toBe(5);
  });
});

// ─── base unit equivalence (for stock validation) ─────────────────────────────

describe("CartItem base unit equivalence", () => {
  it("base unit item has base unit equivalent equal to quantity", () => {
    const item = makeCartItem(BASE_NAIL);
    item.quantity = 3;
    // no packaging → baseUnitEquivalent = quantity × 1
    const baseUnits = item.quantity * (item.packagingQty ?? 1);
    expect(baseUnits).toBe(3);
  });

  it("packaging item has base unit equivalent equal to quantity × packagingQty", () => {
    const item = makeCartItem(BOX_NAIL);
    item.quantity = 2;
    const baseUnits = item.quantity * (item.packagingQty ?? 1);
    expect(baseUnits).toBe(200); // 2 boxes × 100 nails
  });
});
