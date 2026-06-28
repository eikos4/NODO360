CREATE TYPE "EmergencyResponseStatus" AS ENUM ('GOING', 'NOT_GOING', 'NOT_AVAILABLE', 'ON_SCENE', 'LOCATION_MARKED');

CREATE TABLE "IncidentEmergencyResponse" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EmergencyResponseStatus" NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "markerLatitude" DOUBLE PRECISION,
    "markerLongitude" DOUBLE PRECISION,
    "note" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentEmergencyResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IncidentEmergencyResponse_incidentId_userId_key" ON "IncidentEmergencyResponse"("incidentId", "userId");
CREATE INDEX "IncidentEmergencyResponse_incidentId_idx" ON "IncidentEmergencyResponse"("incidentId");
CREATE INDEX "IncidentEmergencyResponse_userId_idx" ON "IncidentEmergencyResponse"("userId");

ALTER TABLE "IncidentEmergencyResponse" ADD CONSTRAINT "IncidentEmergencyResponse_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentEmergencyResponse" ADD CONSTRAINT "IncidentEmergencyResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
