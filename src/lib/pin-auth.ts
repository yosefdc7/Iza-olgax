import crypto from "crypto";

/**
 * Sanitizes numeric PIN input to keep only up to 4 digits.
 */
export function sanitizePinInput(val: string): string {
  return val.replace(/\D/g, "").slice(0, 4);
}

/**
 * Validates whether a PIN string conforms to exactly 4 numeric digits.
 */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Securely hashes a 4-digit PIN using scrypt with a unique random salt.
 */
export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a candidate PIN against a stored salt:hash string using constant-time comparison.
 */
export function verifyPin(pin: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !pin) return false;
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const key = crypto.scryptSync(pin, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(key, "hex"));
  } catch {
    return false;
  }
}
