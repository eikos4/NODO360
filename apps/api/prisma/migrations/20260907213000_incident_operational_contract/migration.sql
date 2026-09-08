-- Estado operativo explícito, inicialmente derivado de las fechas históricas.
-- Idempotent: create type only if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "IncidentStatus" AS ENUM ('ACTIVE', 'ARRIVED', 'CLOSED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add status column to Incident only if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Incident' AND column_name = 'status'
  ) THEN
    ALTER TABLE "Incident"
    ADD COLUMN "status" "IncidentStatus" NOT NULL DEFAULT 'ACTIVE';
  END IF;
END $$;

UPDATE "Incident"
SET "status" = CASE
  WHEN "closedAt" IS NOT NULL THEN 'CLOSED'::"IncidentStatus"
  WHEN "arrivedAt" IS NOT NULL THEN 'ARRIVED'::"IncidentStatus"
  ELSE 'ACTIVE'::"IncidentStatus"
END;

CREATE INDEX IF NOT EXISTS "Incident_companyId_status_idx" ON "Incident"("companyId", "status");

-- La respuesta de asistencia permanece en status; estos campos describen hitos independientes.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'IncidentEmergencyResponse' AND column_name = 'onSceneAt'
  ) THEN
    ALTER TABLE "IncidentEmergencyResponse"
    ADD COLUMN "onSceneAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'IncidentEmergencyResponse' AND column_name = 'locationMarkedAt'
  ) THEN
    ALTER TABLE "IncidentEmergencyResponse"
    ADD COLUMN "locationMarkedAt" TIMESTAMP(3);
  END IF;
END $$;

UPDATE "IncidentEmergencyResponse"
SET "onSceneAt" = COALESCE("onSceneAt", "respondedAt")
WHERE "status" = 'ON_SCENE';

UPDATE "IncidentEmergencyResponse"
SET "locationMarkedAt" = COALESCE("locationMarkedAt", "respondedAt")
WHERE "status" = 'LOCATION_MARKED';

-- LOCATION_MARKED era un evento de ubicación, no una decisión de asistencia.
-- First, drop NOT NULL so we can set null values safely (in case it hasn't been dropped yet)
ALTER TABLE "IncidentEmergencyResponse" ALTER COLUMN "status" DROP NOT NULL;

-- Now safely set LOCATION_MARKED rows to null
UPDATE "IncidentEmergencyResponse"
SET "status" = NULL
WHERE "status" = 'LOCATION_MARKED';

-- Create EmergencyResponseEventType if not exists
DO $$ BEGIN
  CREATE TYPE "EmergencyResponseEventType" AS ENUM ('RESPONSE', 'LOCATION_MARKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create history table only if it doesn't exist
CREATE TABLE IF NOT EXISTS "IncidentEmergencyResponseHistory" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "IncidentEmergencyResponseHistory_incidentId_userId_idempotencyKey_key"
ON "IncidentEmergencyResponseHistory"("incidentId", "userId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "IncidentEmergencyResponseHistory_incidentId_createdAt_idx"
ON "IncidentEmergencyResponseHistory"("incidentId", "createdAt");
CREATE INDEX IF NOT EXISTS "IncidentEmergencyResponseHistory_userId_createdAt_idx"
ON "IncidentEmergencyResponseHistory"("userId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'IncidentEmergencyResponseHistory_incidentId_fkey'
  ) THEN
    ALTER TABLE "IncidentEmergencyResponseHistory"
    ADD CONSTRAINT "IncidentEmergencyResponseHistory_incidentId_fkey"
    FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'IncidentEmergencyResponseHistory_userId_fkey'
  ) THEN
    ALTER TABLE "IncidentEmergencyResponseHistory"
    ADD CONSTRAINT "IncidentEmergencyResponseHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
