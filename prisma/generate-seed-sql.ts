import crypto from "crypto";
import fs from "fs";
import { hashPin } from "../src/lib/pin-auth";

async function hashPassword(password: string): Promise<string> {
  const saltBytes = crypto.randomBytes(16);
  const saltHex = saltBytes.toString("hex");
  const keyBuf = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      password.normalize("NFKC"),
      saltHex,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, derived) => {
        if (err) reject(err);
        else resolve(derived);
      }
    );
  });
  return `${saltHex}:${keyBuf.toString("hex")}`;
}

async function main() {
  const adminId = "admin_user_001";
  const cashierId = "cashier_user_001";
  const adminPass = await hashPassword("admin123456");
  const cashierPass = await hashPassword("cashier123456");
  const adminPin = hashPin("1234");
  const cashierPin = hashPin("5678");
  const now = new Date().toISOString();

  const sql = `
INSERT OR REPLACE INTO "BusinessSettings" ("id", "name", "currency", "currencyDecimals", "taxRate", "taxName", "receiptFooter", "language", "loyaltyEnabled", "loyaltyEarnRate", "loyaltyRedeemValue", "lowStockThreshold", "storageProvider", "posAutoLockMinutes", "setupComplete", "createdAt", "updatedAt")
VALUES ('singleton', 'Izah POS', '$', 2, 0.10, 'Tax', 'Thank you for your purchase!', 'en', 0, 1, 100, 5, 'local', 0, 1, '${now}', '${now}');

INSERT OR REPLACE INTO "User" ("id", "name", "email", "emailVerified", "role", "pin", "createdAt", "updatedAt")
VALUES ('${adminId}', 'Admin User', 'admin@example.com', 1, 'ADMIN', '${adminPin}', '${now}', '${now}');

INSERT OR REPLACE INTO "Account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
VALUES ('acc_admin', '${adminId}', 'credential', '${adminId}', '${adminPass}', '${now}', '${now}');

INSERT OR REPLACE INTO "User" ("id", "name", "email", "emailVerified", "role", "pin", "createdAt", "updatedAt")
VALUES ('${cashierId}', 'Cashier User', 'cashier@example.com', 1, 'CASHIER', '${cashierPin}', '${now}', '${now}');

INSERT OR REPLACE INTO "Account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
VALUES ('acc_cashier', '${cashierId}', 'credential', '${cashierId}', '${cashierPass}', '${now}', '${now}');

INSERT OR REPLACE INTO "Product" ("id", "name", "sku", "barcode", "price", "cost", "stock", "category", "lowStockThreshold", "active", "createdAt", "updatedAt")
VALUES
('prod_1', 'Espresso', 'ESP-001', '100001', 3.50, 0.80, 100, 'Beverages', 10, 1, '${now}', '${now}'),
('prod_2', 'Cappuccino', 'CAP-001', '100002', 4.50, 1.20, 80, 'Beverages', 10, 1, '${now}', '${now}'),
('prod_3', 'Latte', 'LAT-001', '100003', 4.75, 1.30, 90, 'Beverages', 10, 1, '${now}', '${now}'),
('prod_4', 'Croissant', 'BAK-001', '100004', 3.25, 0.90, 40, 'Bakery', 5, 1, '${now}', '${now}'),
('prod_5', 'Blueberry Muffin', 'BAK-002', '100005', 3.75, 1.00, 30, 'Bakery', 5, 1, '${now}', '${now}'),
('prod_6', 'Chocolate Cookie', 'BAK-003', '100006', 2.50, 0.60, 50, 'Bakery', 10, 1, '${now}', '${now}'),
('prod_7', 'Sparkling Water', 'BEV-001', '100007', 2.00, 0.50, 120, 'Beverages', 15, 1, '${now}', '${now}'),
('prod_8', 'Iced Matcha Latte', 'BEV-002', '100008', 5.25, 1.50, 60, 'Beverages', 10, 1, '${now}', '${now}');

INSERT OR REPLACE INTO "Customer" ("id", "name", "phone", "email", "loyaltyPoints", "notes", "createdAt", "updatedAt")
VALUES ('cust_1', 'Jane Doe', '+1 555 0199', 'jane@example.com', 150, 'Regular customer', '${now}', '${now}');
`;

  fs.writeFileSync("prisma/seed.sql", sql.trim());
  console.log("✅ prisma/seed.sql created");
}

main().catch(console.error);
