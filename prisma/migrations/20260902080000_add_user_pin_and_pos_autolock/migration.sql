-- AlterTable
ALTER TABLE "User" ADD COLUMN "pin" TEXT;

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN "posAutoLockMinutes" INTEGER NOT NULL DEFAULT 0;
