ALTER TABLE "Product"
  ALTER COLUMN "stock" TYPE DECIMAL(14,4) USING "stock"::DECIMAL(14,4),
  ALTER COLUMN "stock" SET DEFAULT 0,
  ALTER COLUMN "lowStockThreshold" TYPE DECIMAL(14,4) USING "lowStockThreshold"::DECIMAL(14,4),
  ALTER COLUMN "lowStockThreshold" SET DEFAULT 5,
  ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'pc',
  ADD COLUMN "quantityPrecision" INTEGER NOT NULL DEFAULT 0;

ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

ALTER TABLE "SaleItem"
  ALTER COLUMN "quantity" TYPE DECIMAL(14,4) USING "quantity"::DECIMAL(14,4),
  ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'pc',
  ADD COLUMN "unitCost" DECIMAL(14,4);

ALTER TABLE "StockAdjustment"
  ALTER COLUMN "delta" TYPE DECIMAL(14,4) USING "delta"::DECIMAL(14,4);

ALTER TABLE "BusinessSettings"
  ADD COLUMN "businessTimezone" TEXT NOT NULL DEFAULT 'Asia/Manila';

CREATE TABLE "ReceiptSeries" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReceiptSeries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceiptSeries_name_key" ON "ReceiptSeries"("name");

ALTER TABLE "Sale"
  ADD COLUMN "receiptSeriesId" TEXT,
  ADD COLUMN "receiptNumber" INTEGER,
  ADD COLUMN "legacyReference" TEXT,
  ADD COLUMN "backfilled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Sale"
SET "legacyReference" = "id", "backfilled" = true
WHERE "receiptSeriesId" IS NULL;

UPDATE "SaleItem" AS si
SET "unit" = COALESCE(p."unit", 'pc'), "unitCost" = p."cost"
FROM "Product" AS p
WHERE si."productId" = p."id";

CREATE UNIQUE INDEX "Sale_receiptSeriesId_receiptNumber_key"
  ON "Sale"("receiptSeriesId", "receiptNumber");

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_receiptSeriesId_fkey"
  FOREIGN KEY ("receiptSeriesId") REFERENCES "ReceiptSeries"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
