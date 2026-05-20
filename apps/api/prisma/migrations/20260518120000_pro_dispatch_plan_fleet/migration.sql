-- AlterTable
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "emergencyPlanId" TEXT,
ADD COLUMN IF NOT EXISTS "planChecklist" JSONB;

-- AlterTable
ALTER TABLE "GuardLogEntry" ADD COLUMN IF NOT EXISTS "incidentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GuardLogEntry_incidentId_key" ON "GuardLogEntry"("incidentId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Incident" ADD CONSTRAINT "Incident_emergencyPlanId_fkey" FOREIGN KEY ("emergencyPlanId") REFERENCES "EmergencyPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "GuardLogEntry" ADD CONSTRAINT "GuardLogEntry_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
