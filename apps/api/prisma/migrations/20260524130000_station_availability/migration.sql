-- AlterTable
ALTER TABLE "User" ADD COLUMN "stationAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "stationAvailableAt" TIMESTAMP(3);

CREATE INDEX "User_companyId_stationAvailable_idx" ON "User"("companyId", "stationAvailable");
