import { describe, it, expect } from "vitest";
import { packagingFormSchema } from "@/lib/validations/product";

describe("packagingFormSchema", () => {
  it("accepts a valid packaging row", () => {
    const result = packagingFormSchema.safeParse({
      name: "Box of 100",
      conversionQty: 100,
      price: 300,
      barcode: "8888001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Box of 100");
      expect(result.data.conversionQty).toBe(100);
      expect(result.data.price).toBe(300);
      expect(result.data.barcode).toBe("8888001");
    }
  });

  it("accepts a packaging row without a barcode", () => {
    const result = packagingFormSchema.safeParse({
      name: "Half Dozen",
      conversionQty: 6,
      price: 50,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an existing packaging row with an id", () => {
    const result = packagingFormSchema.safeParse({
      id: "pkg-existing-1",
      name: "Bag of 500",
      conversionQty: 500,
      price: 1200,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("pkg-existing-1");
    }
  });

  it("rejects a row with an empty name", () => {
    const result = packagingFormSchema.safeParse({
      name: "",
      conversionQty: 100,
      price: 300,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find((e) => e.path[0] === "name");
      expect(nameError).toBeDefined();
    }
  });

  it("rejects conversionQty of 1 (must be at least 2)", () => {
    const result = packagingFormSchema.safeParse({
      name: "Singleton",
      conversionQty: 1,
      price: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const qtyError = result.error.issues.find((e) => e.path[0] === "conversionQty");
      expect(qtyError).toBeDefined();
    }
  });

  it("rejects non-integer conversionQty", () => {
    const result = packagingFormSchema.safeParse({
      name: "Half Box",
      conversionQty: 10.5,
      price: 150,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = packagingFormSchema.safeParse({
      name: "Box of 100",
      conversionQty: 100,
      price: -5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const priceError = result.error.issues.find((e) => e.path[0] === "price");
      expect(priceError).toBeDefined();
    }
  });

  it("accepts price of zero", () => {
    const result = packagingFormSchema.safeParse({
      name: "Free Sample Pack",
      conversionQty: 10,
      price: 0,
    });
    expect(result.success).toBe(true);
  });
});
