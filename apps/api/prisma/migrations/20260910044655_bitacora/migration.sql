/*
  Warnings:

  - A unique constraint covering the columns `[operativeNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_companyId_isMaquinista_idx";

-- DropIndex
DROP INDEX "User_companyId_operativeNumber_idx";

-- DropIndex
DROP INDEX "User_companyId_operativeNumber_key";

-- DropIndex
DROP INDEX "User_companyId_stationAvailable_idx";

-- DropIndex
DROP INDEX "User_supportCompanyId_idx";

-- DropIndex
DROP INDEX "Vehicle_principalMaquinistaId_idx";

-- CreateIndex
CREATE INDEX "Equipment_companyId_idx" ON "Equipment"("companyId");

-- CreateIndex
CREATE INDEX "Incident_companyId_idx" ON "Incident"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_operativeNumber_key" ON "User"("operativeNumber");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "Vehicle_companyId_idx" ON "Vehicle"("companyId");

-- RenameIndex
ALTER INDEX "IncidentEmergencyResponseHistory_incidentId_userId_idempotencyK" RENAME TO "IncidentEmergencyResponseHistory_incidentId_userId_idempote_key";
