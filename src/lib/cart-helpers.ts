/**
 * cart-helpers.ts
 *
 * Pure functions for cart operations. Framework-free so they can be
 * unit-tested without Zustand or localStorage.
 *
 * Cart key format:
 *   - Base unit item:     `${productId}::base`
 *   - Packaged item:      `${productId}::${packagingId}`
 *
 * This means the same product can appear in the cart simultaneously as
 * both a loose piece AND a boxed unit (with independent prices).
 */

import type { CartItem } from "@/store/cart";

// ─── cartKey ─────────────────────────────────────────────────────────────────

export function cartKey(productId: string, packagingId?: string): string {
  return packagingId ? `${productId}::${packagingId}` : `${productId}::base`;
}

// ─── makeCartItem ─────────────────────────────────────────────────────────────

/**
 * Create a new cart item with quantity = 1 and empty notes.
 * Preserves all packaging fields when present.
 */
export function makeCartItem(item: Omit<CartItem, "quantity" | "notes">): CartItem {
  return { ...item, quantity: 1, notes: "" };
}

// ─── cartAddItem ──────────────────────────────────────────────────────────────

/**
 * Add an item to the cart. If an item with the same cart key already exists,
 * increment its quantity by 1. Otherwise append a new item with quantity = 1.
 */
export function cartAddItem(
  items: CartItem[],
  incoming: Omit<CartItem, "quantity" | "notes">
): CartItem[] {
  const key = cartKey(incoming.productId, incoming.packagingId);
  const existingIndex = items.findIndex(
    (i) => cartKey(i.productId, i.packagingId) === key
  );
  if (existingIndex !== -1) {
    return items.map((item, idx) =>
      idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
    );
  }
  return [...items, makeCartItem(incoming)];
}

// ─── cartSubtotal ─────────────────────────────────────────────────────────────

/**
 * Sum of (price × quantity) across all cart items.
 * For packaged items, `price` is the packaging price (not the base unit price).
 */
export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

// ─── cartUpdateQuantity ───────────────────────────────────────────────────────

/**
 * Set a specific item's quantity by its cart key.
 * If the new quantity is ≤ 0, the item is removed from the cart.
 */
export function cartUpdateQuantity(
  items: CartItem[],
  key: string,
  quantity: number
): CartItem[] {
  if (quantity <= 0) {
    return items.filter((i) => cartKey(i.productId, i.packagingId) !== key);
  }
  return items.map((i) =>
    cartKey(i.productId, i.packagingId) === key ? { ...i, quantity } : i
  );
}

// ─── baseUnitEquivalent ───────────────────────────────────────────────────────

/**
 * The number of base units a cart item represents.
 * For base-unit items: quantity × 1.
 * For packaged items:  quantity × packagingQty.
 *
 * Used by stock validation before checkout.
 */
export function baseUnitEquivalent(item: CartItem): number {
  return item.quantity * (item.packagingQty ?? 1);
}
