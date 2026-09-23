import { describe, it, expect } from "vitest";
import {
  toBaseUnits,
  packagingUnitsAvailable,
  formatCompoundStock,
  parseCompoundStock,
  validatePackagingSale,
  formatPackagingCartLabel,
} from "@/lib/packaging";

const BOX_OF_100: { id: string; name: string; conversionQty: number; price: number; barcode: string | null } = {
  id: "pkg-1",
  name: "Box of 100",
  conversionQty: 100,
  price: 300,
  barcode: "8888001",
};

// ─── toBaseUnits ────────────────────────────────────────────────────────────

describe("toBaseUnits", () => {
  it("converts 1 box of 100 to 100 base units", () => {
    expect(toBaseUnits(1, 100)).toBe(100);
  });

  it("converts 2 boxes of 100 to 200 base units", () => {
    expect(toBaseUnits(2, 100)).toBe(200);
  });

  it("converts 0 boxes to 0 base units", () => {
    expect(toBaseUnits(0, 100)).toBe(0);
  });

  it("converts fractional packaging qty (e.g. 0.5 of a 100-pack) to 50 base units", () => {
    expect(toBaseUnits(0.5, 100)).toBe(50);
  });

  it("throws when conversion qty is zero or negative", () => {
    expect(() => toBaseUnits(1, 0)).toThrow("conversionQty must be positive");
    expect(() => toBaseUnits(1, -5)).toThrow("conversionQty must be positive");
  });

  it("throws when packaging qty is negative", () => {
    expect(() => toBaseUnits(-1, 100)).toThrow("packagingQty must be non-negative");
  });
});

// ─── packagingUnitsAvailable ────────────────────────────────────────────────

describe("packagingUnitsAvailable", () => {
  it("returns 1 when stock exactly equals one box", () => {
    expect(packagingUnitsAvailable(100, 100)).toBe(1);
  });

  it("returns 4 when stock is 423 and box is 100 (floors, ignores remainder)", () => {
    expect(packagingUnitsAvailable(423, 100)).toBe(4);
  });

  it("returns 0 when stock is less than one box", () => {
    expect(packagingUnitsAvailable(98, 100)).toBe(0);
  });

  it("returns 0 when stock is 0", () => {
    expect(packagingUnitsAvailable(0, 100)).toBe(0);
  });

  it("throws when conversionQty is zero", () => {
    expect(() => packagingUnitsAvailable(100, 0)).toThrow("conversionQty must be positive");
  });
});

// ─── formatCompoundStock ────────────────────────────────────────────────────

describe("formatCompoundStock", () => {
  it("formats 423 pcs as '4 Boxes + 23 pcs'", () => {
    expect(formatCompoundStock(423, BOX_OF_100, "pc")).toBe("4 Boxes + 23 pcs");
  });

  it("formats exact box count with no remainder as '4 Boxes + 0 pcs'", () => {
    expect(formatCompoundStock(400, BOX_OF_100, "pc")).toBe("4 Boxes + 0 pcs");
  });

  it("formats less than one box as '0 Boxes + 50 pcs'", () => {
    expect(formatCompoundStock(50, BOX_OF_100, "pc")).toBe("0 Boxes + 50 pcs");
  });

  it("formats zero stock as '0 Boxes + 0 pcs'", () => {
    expect(formatCompoundStock(0, BOX_OF_100, "pc")).toBe("0 Boxes + 0 pcs");
  });

  it("uses the packaging name in the label", () => {
    const sixPack = { id: "pkg-2", name: "6-Pack", conversionQty: 6, price: 60, barcode: null };
    expect(formatCompoundStock(13, sixPack, "can")).toBe("2 6-Packs + 1 cans");
  });
});

// ─── parseCompoundStock ─────────────────────────────────────────────────────

describe("parseCompoundStock", () => {
  it("calculates 4 boxes + 23 pieces as 423 base units", () => {
    expect(parseCompoundStock(4, 23, 100)).toBe(423);
  });

  it("calculates 0 boxes + 50 pieces as 50 base units", () => {
    expect(parseCompoundStock(0, 50, 100)).toBe(50);
  });

  it("calculates 2 boxes + 0 pieces as 200 base units", () => {
    expect(parseCompoundStock(2, 0, 100)).toBe(200);
  });

  it("throws when boxes is negative", () => {
    expect(() => parseCompoundStock(-1, 0, 100)).toThrow("boxes must be non-negative");
  });

  it("throws when pieces is negative", () => {
    expect(() => parseCompoundStock(0, -1, 100)).toThrow("pieces must be non-negative");
  });
});

// ─── validatePackagingSale ──────────────────────────────────────────────────

describe("validatePackagingSale", () => {
  it("returns ok=true when selling 1 box and stock has 100", () => {
    const result = validatePackagingSale(1, 100, 100);
    expect(result.ok).toBe(true);
    expect(result.required).toBe(100);
    expect(result.available).toBe(100);
  });

  it("returns ok=true when selling 2 boxes and stock has 250", () => {
    const result = validatePackagingSale(2, 100, 250);
    expect(result.ok).toBe(true);
    expect(result.required).toBe(200);
  });

  it("returns ok=false when selling 1 box (100) but only 98 in stock", () => {
    const result = validatePackagingSale(1, 100, 98);
    expect(result.ok).toBe(false);
    expect(result.required).toBe(100);
    expect(result.available).toBe(98);
  });

  it("returns ok=false when stock is 0", () => {
    const result = validatePackagingSale(1, 100, 0);
    expect(result.ok).toBe(false);
  });

  it("returns ok=false when trying to sell 0 packaging units", () => {
    const result = validatePackagingSale(0, 100, 500);
    expect(result.ok).toBe(false);
  });
});

// ─── formatPackagingCartLabel ───────────────────────────────────────────────

describe("formatPackagingCartLabel", () => {
  it("formats 1 box as '1 × Box of 100 (100 pcs)'", () => {
    expect(formatPackagingCartLabel(1, BOX_OF_100, "pc")).toBe("1 × Box of 100 (100 pcs)");
  });

  it("formats 2 boxes as '2 × Box of 100 (100 pcs)'", () => {
    expect(formatPackagingCartLabel(2, BOX_OF_100, "pc")).toBe("2 × Box of 100 (100 pcs)");
  });

  it("uses base unit in the label", () => {
    const crate = { id: "pkg-3", name: "Crate of 24", conversionQty: 24, price: 480, barcode: null };
    expect(formatPackagingCartLabel(1, crate, "can")).toBe("1 × Crate of 24 (24 cans)");
  });
});
