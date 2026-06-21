-- CreateEnum
CREATE TYPE "EmergencyBitacoraSource" AS ENUM ('MANUAL', 'SALA_MAQUINAS', 'INCIDENTE');

-- CreateTable
CREATE TABLE "EmergencyBitacoraEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "incidentId" TEXT,
    "title" TEXT NOT NULL,
    "emergencyType" TEXT,
    "address" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "actionsTaken" TEXT,
    "personnelNotes" TEXT,
    "vehicleNotes" TEXT,
    "outcome" TEXT,
    "observations" TEXT,
    "source" "EmergencyBitacoraSource" NOT NULL DEFAULT 'MANUAL',
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyBitacoraEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyBitacoraEntry_incidentId_key" ON "EmergencyBitacoraEntry"("incidentId");

-- CreateIndex
CREATE INDEX "EmergencyBitacoraEntry_companyId_idx" ON "EmergencyBitacoraEntry"("companyId");

-- CreateIndex
CREATE INDEX "EmergencyBitacoraEntry_occurredAt_idx" ON "EmergencyBitacoraEntry"("occurredAt");

-- AddForeignKey
ALTER TABLE "EmergencyBitacoraEntry" ADD CONSTRAINT "EmergencyBitacoraEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyBitacoraEntry" ADD CONSTRAINT "EmergencyBitacoraEntry_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyBitacoraEntry" ADD CONSTRAINT "EmergencyBitacoraEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
