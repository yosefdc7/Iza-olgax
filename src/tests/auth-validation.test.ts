import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  updatePinSchema,
} from "@/lib/user-schemas";

describe("User Actions & Auth Zod Schemas", () => {
  describe("createUserSchema", () => {
    it("accepts relaxed 4-character passwords", () => {
      const valid = createUserSchema.safeParse({
        name: "Jane Cashier",
        email: "jane@pos.com",
        password: "1234",
        role: "CASHIER",
      });
      expect(valid.success).toBe(true);
    });

    it("accepts a 4-character alphanumeric password with a valid 4-digit PIN", () => {
      const valid = createUserSchema.safeParse({
        name: "Admin User",
        email: "admin@pos.com",
        password: "pass",
        pin: "5678",
        role: "ADMIN",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects passwords with fewer than 4 characters", () => {
      const invalid = createUserSchema.safeParse({
        name: "Jane Cashier",
        email: "jane@pos.com",
        password: "123",
        role: "CASHIER",
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain("at least 4 characters");
      }
    });

    it("rejects non-4-digit PINs during user creation", () => {
      const invalidPin = createUserSchema.safeParse({
        name: "Jane Cashier",
        email: "jane@pos.com",
        password: "password123",
        pin: "123",
        role: "CASHIER",
      });
      expect(invalidPin.success).toBe(false);
      if (!invalidPin.success) {
        expect(invalidPin.error.issues[0].message).toContain("exactly 4 digits");
      }
    });
  });

  describe("updateUserSchema", () => {
    it("accepts valid 4-digit PIN update", () => {
      const valid = updateUserSchema.safeParse({
        name: "Updated Name",
        pin: "9999",
      });
      expect(valid.success).toBe(true);
    });

    it("accepts empty string PIN to clear PIN", () => {
      const valid = updateUserSchema.safeParse({
        pin: "",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid PIN formats", () => {
      const invalid = updateUserSchema.safeParse({
        pin: "abcd",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("changePasswordSchema", () => {
    it("accepts relaxed 4-character new passwords", () => {
      const valid = changePasswordSchema.safeParse({
        currentPassword: "oldpassword",
        newPassword: "4321",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects new passwords with fewer than 4 characters", () => {
      const invalid = changePasswordSchema.safeParse({
        currentPassword: "oldpassword",
        newPassword: "12",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("updatePinSchema", () => {
    it("accepts exactly 4 numeric digits", () => {
      expect(updatePinSchema.safeParse({ pin: "0000" }).success).toBe(true);
      expect(updatePinSchema.safeParse({ pin: "1234" }).success).toBe(true);
    });

    it("rejects non-4 digit PINs", () => {
      expect(updatePinSchema.safeParse({ pin: "123" }).success).toBe(false);
      expect(updatePinSchema.safeParse({ pin: "12345" }).success).toBe(false);
      expect(updatePinSchema.safeParse({ pin: "a123" }).success).toBe(false);
    });
  });
});
