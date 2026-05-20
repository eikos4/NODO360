-- CreateEnum
CREATE TYPE "DispatchSource" AS ENUM ('BOTONERA', 'MANUAL');

-- CreateEnum
CREATE TYPE "EmergencyPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "EmergencyPlan" ADD COLUMN     "checklist" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "status" "EmergencyPlanStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "dispatchNotes" TEXT,
ADD COLUMN     "dispatchSource" "DispatchSource" DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "IncidentVehicle" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyPlanAttachment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyPlanAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyPlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emergencyType" "EmergencyType" NOT NULL,
    "severity" "EmergencySeverity" NOT NULL,
    "status" "EmergencyPlanStatus" NOT NULL,
    "procedures" JSONB NOT NULL,
    "checklist" JSONB NOT NULL,
    "changedBy" TEXT,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyPlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncidentVehicle_incidentId_vehicleId_key" ON "IncidentVehicle"("incidentId", "vehicleId");

-- CreateIndex
CREATE INDEX "EmergencyPlanVersion_planId_version_idx" ON "EmergencyPlanVersion"("planId", "version");

-- AddForeignKey
ALTER TABLE "IncidentVehicle" ADD CONSTRAINT "IncidentVehicle_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentVehicle" ADD CONSTRAINT "IncidentVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyPlanAttachment" ADD CONSTRAINT "EmergencyPlanAttachment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "EmergencyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyPlanVersion" ADD CONSTRAINT "EmergencyPlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "EmergencyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
