/**
 * packaging.ts
 *
 * Pure functions for product packaging / unit-of-measure conversion.
 * No DB, no framework dependencies — fully testable.
 *
 * Model: inventory is ALWAYS stored in the smallest indivisible base unit
 * (e.g. "piece"). A packaging is a named grouping with a conversion factor
 * (e.g. "Box of 100" → conversionQty = 100). Selling 1 box deducts 100
 * base units from stock.
 */

export interface Packaging {
  id: string;
  name: string;
  /** Number of base units per 1 packaging unit. Must be ≥ 2. */
  conversionQty: number;
  /** Independent sell price for this packaging. Not derived from base price. */
  price: number;
  barcode?: string | null;
}

// ─── toBaseUnits ──────────────────────────────────────────────────────────────

/**
 * Convert a quantity in packaging units to base units.
 * e.g. 2 boxes × 100 nails/box = 200 nails
 */
export function toBaseUnits(packagingQty: number, conversionQty: number): number {
  if (conversionQty <= 0) {
    throw new Error("conversionQty must be positive");
  }
  if (packagingQty < 0) {
    throw new Error("packagingQty must be non-negative");
  }
  return packagingQty * conversionQty;
}

// ─── packagingUnitsAvailable ──────────────────────────────────────────────────

/**
 * How many whole packaging units can be formed from the current base stock.
 * Always floors — a partial box does not count as a sellable box.
 * e.g. 423 nails / 100-nail box = 4 (not 4.23)
 */
export function packagingUnitsAvailable(baseStock: number, conversionQty: number): number {
  if (conversionQty <= 0) {
    throw new Error("conversionQty must be positive");
  }
  return Math.floor(baseStock / conversionQty);
}

// ─── formatCompoundStock ──────────────────────────────────────────────────────

/**
 * Format base-unit stock as a human-readable compound string.
 * e.g. 423 nails with a "Box of 100" packaging → "4 Boxes + 23 pcs"
 */
export function formatCompoundStock(
  baseStock: number,
  packaging: Packaging,
  baseUnit: string
): string {
  const boxes = Math.floor(baseStock / packaging.conversionQty);
  const remainder = Math.round(baseStock % packaging.conversionQty);
  // Use the first word of the packaging name as the short label (e.g. "Box of 100" → "Box")
  const shortName = packaging.name.split(/\s+/)[0];
  // Simple English pluralization: words ending in x/s/sh/ch → add 'es', otherwise add 's'
  const plural = /([xsz]|ch|sh)$/i.test(shortName) ? `${shortName}es` : `${shortName}s`;
  const boxLabel = boxes === 1 ? shortName : plural;
  return `${boxes} ${boxLabel} + ${remainder} ${baseUnit}s`;
}

// ─── parseCompoundStock ───────────────────────────────────────────────────────

/**
 * Convert a compound stock count (boxes + loose pieces) to a base-unit total.
 * e.g. 4 boxes + 23 pieces @ 100/box = 423
 */
export function parseCompoundStock(
  boxes: number,
  pieces: number,
  conversionQty: number
): number {
  if (boxes < 0) throw new Error("boxes must be non-negative");
  if (pieces < 0) throw new Error("pieces must be non-negative");
  return boxes * conversionQty + pieces;
}

// ─── validatePackagingSale ────────────────────────────────────────────────────

/**
 * Validate that the current base stock can fulfil a packaged sale.
 * Returns ok=true only when (packagingQty × conversionQty) ≤ baseStock
 * AND packagingQty > 0.
 */
export function validatePackagingSale(
  packagingQty: number,
  conversionQty: number,
  baseStock: number
): { ok: boolean; required: number; available: number } {
  const required = packagingQty * conversionQty;
  const available = baseStock;
  const ok = packagingQty > 0 && required <= available;
  return { ok, required, available };
}

// ─── formatPackagingCartLabel ─────────────────────────────────────────────────

/**
 * Format the cart line label for a packaged item.
 * e.g. 1 box of 100 nails → "1 × Box of 100 (100 pcs)"
 */
export function formatPackagingCartLabel(
  quantity: number,
  packaging: Packaging,
  baseUnit: string
): string {
  return `${quantity} × ${packaging.name} (${packaging.conversionQty} ${baseUnit}s)`;
}
