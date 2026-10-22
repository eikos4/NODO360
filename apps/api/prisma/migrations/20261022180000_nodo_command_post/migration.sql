-- CreateEnum
CREATE TYPE "CommandPostStatus" AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE "CommandResourceOrigin" AS ENUM ('NODO360', 'EXTERNAL');
CREATE TYPE "CommandResourceStatus" AS ENUM ('SOLICITADO', 'DESPACHADO', 'EN_TRASLADO', 'ARRIBANDO', 'DISPONIBLE', 'ASIGNADO', 'EN_OPERACION', 'REHABILITACION', 'RETORNANDO', 'FUERA_DE_SERVICIO', 'RETIRADO');
CREATE TYPE "CommandSectorStatus" AS ENUM ('EN_OPERACION', 'EN_ESPERA', 'COMPLETADO', 'SUSPENDIDO');
CREATE TYPE "CommandLogKind" AS ENUM ('SYSTEM', 'COMMAND', 'RESOURCE', 'SECTOR', 'NOVELTY', 'REQUEST', 'ALERT', 'CLOSE');
CREATE TYPE "CommandNoveltyCategory" AS ENUM ('OPERACIONAL', 'SEGURIDAD', 'MANDO', 'RECURSO', 'CLIMA', 'EVACUACION', 'LESIONADO', 'SOLICITUD', 'INFORMACION');
CREATE TYPE "CommandRequestPriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE "CommandRequestStatus" AS ENUM ('SOLICITADO', 'DESPACHADO', 'EN_TRASLADO', 'ARRIBADO', 'CANCELADO');
CREATE TYPE "CommandPointKind" AS ENUM ('ABASTECIMIENTO', 'SEGURIDAD', 'PUESTO_MEDICO', 'OTRO');

-- CreateTable
CREATE TABLE "CommandPost" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" "CommandPostStatus" NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closeNote" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "openedById" TEXT,
    "openedByName" TEXT NOT NULL,
    "openedByRank" TEXT,
    "initialNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommandPostCommand" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "assumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "rank" TEXT,
    "note" TEXT,
    "transferredByName" TEXT,

    CONSTRAINT "CommandPostCommand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommandPostSector" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mission" TEXT,
    "responsibleName" TEXT,
    "status" "CommandSectorStatus" NOT NULL DEFAULT 'EN_OPERACION',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandPostSector_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommandPostResource" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "origin" "CommandResourceOrigin" NOT NULL DEFAULT 'EXTERNAL',
    "vehicleId" TEXT,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "companyName" TEXT,
    "institution" TEXT,
    "responsibleName" TEXT,
    "contact" TEXT,
    "staffing" INTEGER NOT NULL DEFAULT 0,
    "status" "CommandResourceStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "sectorId" TEXT,
    "mission" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "arrivedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandPostResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommandPostLog" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "CommandLogKind" NOT NULL DEFAULT 'SYSTEM',
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "resourceId" TEXT,
    "sectorId" TEXT,
    "previousStatus" TEXT,
    "nextStatus" TEXT,
    "category" "CommandNoveltyCategory",

    CONSTRAINT "CommandPostLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommandPostRequest" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT,
    "priority" "CommandRequestPriority" NOT NULL DEFAULT 'MEDIA',
    "status" "CommandRequestStatus" NOT NULL DEFAULT 'SOLICITADO',
    "sectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandPostRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommandPostPoint" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "kind" "CommandPointKind" NOT NULL DEFAULT 'OTRO',
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommandPostPoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommandPost_incidentId_key" ON "CommandPost"("incidentId");
CREATE INDEX "CommandPost_status_idx" ON "CommandPost"("status");
CREATE INDEX "CommandPostCommand_postId_assumedAt_idx" ON "CommandPostCommand"("postId", "assumedAt");
CREATE INDEX "CommandPostSector_postId_idx" ON "CommandPostSector"("postId");
CREATE INDEX "CommandPostResource_postId_idx" ON "CommandPostResource"("postId");
CREATE INDEX "CommandPostResource_sectorId_idx" ON "CommandPostResource"("sectorId");
CREATE INDEX "CommandPostLog_postId_occurredAt_idx" ON "CommandPostLog"("postId", "occurredAt");
CREATE INDEX "CommandPostRequest_postId_idx" ON "CommandPostRequest"("postId");
CREATE INDEX "CommandPostPoint_postId_idx" ON "CommandPostPoint"("postId");

ALTER TABLE "CommandPost" ADD CONSTRAINT "CommandPost_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommandPostCommand" ADD CONSTRAINT "CommandPostCommand_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommandPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommandPostSector" ADD CONSTRAINT "CommandPostSector_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommandPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommandPostResource" ADD CONSTRAINT "CommandPostResource_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommandPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommandPostResource" ADD CONSTRAINT "CommandPostResource_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "CommandPostSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommandPostLog" ADD CONSTRAINT "CommandPostLog_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommandPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommandPostRequest" ADD CONSTRAINT "CommandPostRequest_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommandPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommandPostRequest" ADD CONSTRAINT "CommandPostRequest_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "CommandPostSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommandPostPoint" ADD CONSTRAINT "CommandPostPoint_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommandPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
