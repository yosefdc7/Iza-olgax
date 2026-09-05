export type LedgerRole = "ADMIN" | "CASHIER";
export type LedgerProtectedField = "unitCost" | "grossProfit" | "sellingValue";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidBusinessDate(value: string): boolean {
  if (!BUSINESS_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function shiftBusinessDate(date: string, days: number): string {
  if (!isValidBusinessDate(date) || !Number.isInteger(days)) {
    throw new Error("Invalid business date");
  }
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function lastBusinessDateOfMonth(date: string): string {
  if (!isValidBusinessDate(date)) throw new Error("Invalid business date");
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export function quantityFitsPrecision(quantity: number, precision: number): boolean {
  if (!Number.isFinite(quantity) || quantity <= 0) return false;
  if (!Number.isInteger(precision) || precision < 0 || precision > 4) return false;
  const factor = 10 ** precision;
  return Math.abs(quantity * factor - Math.round(quantity * factor)) <= 1e-7;
}

export function csvCell(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const text = value == null ? "" : String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
}

export function normalizeQuantity(quantity: number, precision: number): number {
  if (!Number.isInteger(precision) || precision < 0 || precision > 4) {
    throw new Error("Quantity precision must be an integer between 0 and 4");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive finite number");
  }
  const factor = 10 ** precision;
  return Math.round((quantity + Number.EPSILON) * factor) / factor;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localMidnightToUtc(date: string, timeZone: string): Date {
  if (!isValidBusinessDate(date) || !isValidTimeZone(timeZone)) {
    throw new Error("Invalid business date or time zone");
  }
  const [year, month, day] = date.split("-").map(Number);
  let candidate = new Date(Date.UTC(year, month - 1, day));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = zonedParts(candidate, timeZone);
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    candidate = new Date(candidate.getTime() - (represented - Date.UTC(year, month - 1, day)));
  }
  return candidate;
}

export function businessDayUtcRange(date: string, timeZone: string) {
  const start = localMidnightToUtc(date, timeZone);
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = next.toISOString().slice(0, 10);
  return { start, endExclusive: localMidnightToUtc(nextDate, timeZone) };
}

export function businessDateForInstant(instant: Date, timeZone: string) {
  if (!isValidTimeZone(timeZone)) throw new Error("Invalid time zone");
  const parts = zonedParts(instant, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function canViewLedgerField(role: LedgerRole, field: LedgerProtectedField) {
  return role === "ADMIN" || field === "sellingValue";
}

export function resolveLedgerScope(input: {
  role: LedgerRole;
  userId: string;
  today: string;
  requested: { from?: string | null; to?: string | null; cashierId?: string | null };
}) {
  if (input.role === "CASHIER") {
    return { from: input.today, to: input.today, cashierId: input.userId };
  }
  const from = input.requested.from || input.today;
  return { from, to: input.requested.to || from, cashierId: input.requested.cashierId || null };
}

export function formatReceiptReference(input: {
  seriesName?: string | null;
  receiptNumber?: number | null;
  legacyReference?: string | null;
  backfilled?: boolean;
}) {
  if (input.backfilled) {
    return {
      label: `LEGACY-${input.legacyReference ?? "UNKNOWN"}`,
      warning: "Backfilled estimate",
    };
  }
  return {
    label: `${input.seriesName ?? "UNASSIGNED"}-${String(input.receiptNumber ?? 0).padStart(6, "0")}`,
    warning: null,
  };
}
