-- Estado operativo explícito, inicialmente derivado de las fechas históricas.
CREATE TYPE "IncidentStatus" AS ENUM ('ACTIVE', 'ARRIVED', 'CLOSED', 'CANCELLED');
ALTER TABLE "Incident"
ADD COLUMN "status" "IncidentStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "Incident"
SET "status" = CASE
  WHEN "closedAt" IS NOT NULL THEN 'CLOSED'::"IncidentStatus"
  WHEN "arrivedAt" IS NOT NULL THEN 'ARRIVED'::"IncidentStatus"
  ELSE 'ACTIVE'::"IncidentStatus"
END;

CREATE INDEX "Incident_companyId_status_idx" ON "Incident"("companyId", "status");

-- La respuesta de asistencia permanece en status; estos campos describen hitos independientes.
ALTER TABLE "IncidentEmergencyResponse"
ADD COLUMN "onSceneAt" TIMESTAMP(3),
ADD COLUMN "locationMarkedAt" TIMESTAMP(3);

UPDATE "IncidentEmergencyResponse"
SET "onSceneAt" = COALESCE("onSceneAt", "respondedAt")
WHERE "status" = 'ON_SCENE';

UPDATE "IncidentEmergencyResponse"
SET "locationMarkedAt" = COALESCE("locationMarkedAt", "respondedAt")
WHERE "status" = 'LOCATION_MARKED';

-- LOCATION_MARKED era un evento de ubicación, no una decisión de asistencia.
UPDATE "IncidentEmergencyResponse"
SET "status" = NULL
WHERE "status" = 'LOCATION_MARKED';
ALTER TABLE "IncidentEmergencyResponse" ALTER COLUMN "status" DROP NOT NULL;

CREATE TYPE "EmergencyResponseEventType" AS ENUM ('RESPONSE', 'LOCATION_MARKED');

CREATE TABLE "IncidentEmergencyResponseHistory" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventType" "EmergencyResponseEventType" NOT NULL,
  "status" "EmergencyResponseStatus",
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "note" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IncidentEmergencyResponseHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IncidentEmergencyResponseHistory_incidentId_userId_idempotencyKey_key"
ON "IncidentEmergencyResponseHistory"("incidentId", "userId", "idempotencyKey");
CREATE INDEX "IncidentEmergencyResponseHistory_incidentId_createdAt_idx"
ON "IncidentEmergencyResponseHistory"("incidentId", "createdAt");
CREATE INDEX "IncidentEmergencyResponseHistory_userId_createdAt_idx"
ON "IncidentEmergencyResponseHistory"("userId", "createdAt");

ALTER TABLE "IncidentEmergencyResponseHistory"
ADD CONSTRAINT "IncidentEmergencyResponseHistory_incidentId_fkey"
FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentEmergencyResponseHistory"
ADD CONSTRAINT "IncidentEmergencyResponseHistory_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
