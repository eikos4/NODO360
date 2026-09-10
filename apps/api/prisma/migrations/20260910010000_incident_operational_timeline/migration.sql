CREATE TYPE "IncidentTimelineKind" AS ENUM (
  'AVISO',
  'DESPACHO',
  'EN_CAMINO',
  'EN_LUGAR',
  'APOYO',
  'SAMU',
  'CARABINEROS',
  'HIDRANTE',
  'PERSONAS',
  'CONTROLADO',
  'EXTINTO',
  'FALSA_ALARMA',
  'REGRESO',
  'EN_CUARTEL',
  'COMENTARIO'
);

CREATE TABLE "IncidentTimelineEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "kind" "IncidentTimelineKind" NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IncidentTimelineEvent_incidentId_occurredAt_idx" ON "IncidentTimelineEvent"("incidentId", "occurredAt");

ALTER TABLE "IncidentTimelineEvent" ADD CONSTRAINT "IncidentTimelineEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncidentTimelineEvent" ADD CONSTRAINT "IncidentTimelineEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "IncidentTimelineEvent" ("id", "incidentId", "kind", "label", "note", "occurredAt", "authorId", "createdAt")
SELECT
  'otl_' || "id",
  "id",
  'DESPACHO'::"IncidentTimelineKind",
  'Despacho',
  NULLIF(TRIM("dispatchNotes"), ''),
  "dispatchedAt",
  NULL,
  "createdAt"
FROM "Incident"
WHERE NOT EXISTS (
  SELECT 1 FROM "IncidentTimelineEvent" e WHERE e."incidentId" = "Incident"."id"
);
