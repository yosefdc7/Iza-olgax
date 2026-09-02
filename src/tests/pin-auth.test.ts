import { describe, it, expect } from "vitest";
import { isValidPinFormat, hashPin, verifyPin } from "@/lib/pin-auth";

describe("PIN Auth and Validation", () => {
  describe("isValidPinFormat", () => {
    it("accepts valid 4-digit numeric PINs", () => {
      expect(isValidPinFormat("1234")).toBe(true);
      expect(isValidPinFormat("0000")).toBe(true);
      expect(isValidPinFormat("9876")).toBe(true);
    });

    it("rejects non-4-digit strings", () => {
      expect(isValidPinFormat("123")).toBe(false);
      expect(isValidPinFormat("12345")).toBe(false);
      expect(isValidPinFormat("")).toBe(false);
    });

    it("rejects non-numeric characters and whitespace", () => {
      expect(isValidPinFormat("12a4")).toBe(false);
      expect(isValidPinFormat("12 4")).toBe(false);
      expect(isValidPinFormat(" 123")).toBe(false);
      expect(isValidPinFormat("1234 ")).toBe(false);
      expect(isValidPinFormat("abcd")).toBe(false);
    });
  });

  describe("hashPin and verifyPin", () => {
    it("hashes a PIN and successfully verifies it", () => {
      const pin = "1234";
      const hash = hashPin(pin);

      expect(hash).toContain(":");
      expect(verifyPin("1234", hash)).toBe(true);
    });

    it("rejects incorrect PINs against the hash", () => {
      const hash = hashPin("1234");

      expect(verifyPin("0000", hash)).toBe(false);
      expect(verifyPin("1235", hash)).toBe(false);
      expect(verifyPin("4321", hash)).toBe(false);
    });

    it("produces unique hashes for the same PIN due to unique salts", () => {
      const hash1 = hashPin("1234");
      const hash2 = hashPin("1234");

      expect(hash1).not.toBe(hash2);
      expect(verifyPin("1234", hash1)).toBe(true);
      expect(verifyPin("1234", hash2)).toBe(true);
    });

    it("gracefully handles null, undefined, or empty hashes", () => {
      expect(verifyPin("1234", null)).toBe(false);
      expect(verifyPin("1234", undefined)).toBe(false);
      expect(verifyPin("1234", "")).toBe(false);
      expect(verifyPin("1234", "invalidformat")).toBe(false);
    });
  });
});
