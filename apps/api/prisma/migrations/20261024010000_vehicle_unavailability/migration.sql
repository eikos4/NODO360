-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "unavailableReason" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "availableAt" TIMESTAMP(3);
