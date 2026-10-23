-- CreateEnum
CREATE TYPE "CuerpoLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "CuerpoLink" (
    "id" TEXT NOT NULL,
    "aCuerpoId" TEXT NOT NULL,
    "bCuerpoId" TEXT NOT NULL,
    "requestedByCuerpoId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "CuerpoLinkStatus" NOT NULL DEFAULT 'PENDING',
    "incidentId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "CuerpoLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuerpoLinkMessage" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "cuerpoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuerpoLinkMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuerpoLink_aCuerpoId_bCuerpoId_key" ON "CuerpoLink"("aCuerpoId", "bCuerpoId");

-- CreateIndex
CREATE INDEX "CuerpoLink_status_idx" ON "CuerpoLink"("status");

-- CreateIndex
CREATE INDEX "CuerpoLink_requestedByCuerpoId_idx" ON "CuerpoLink"("requestedByCuerpoId");

-- CreateIndex
CREATE INDEX "CuerpoLinkMessage_linkId_createdAt_idx" ON "CuerpoLinkMessage"("linkId", "createdAt");

-- AddForeignKey
ALTER TABLE "CuerpoLink" ADD CONSTRAINT "CuerpoLink_aCuerpoId_fkey" FOREIGN KEY ("aCuerpoId") REFERENCES "Cuerpo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuerpoLink" ADD CONSTRAINT "CuerpoLink_bCuerpoId_fkey" FOREIGN KEY ("bCuerpoId") REFERENCES "Cuerpo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuerpoLink" ADD CONSTRAINT "CuerpoLink_requestedByCuerpoId_fkey" FOREIGN KEY ("requestedByCuerpoId") REFERENCES "Cuerpo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuerpoLink" ADD CONSTRAINT "CuerpoLink_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuerpoLink" ADD CONSTRAINT "CuerpoLink_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuerpoLinkMessage" ADD CONSTRAINT "CuerpoLinkMessage_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "CuerpoLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuerpoLinkMessage" ADD CONSTRAINT "CuerpoLinkMessage_cuerpoId_fkey" FOREIGN KEY ("cuerpoId") REFERENCES "Cuerpo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuerpoLinkMessage" ADD CONSTRAINT "CuerpoLinkMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuerpoLinkMessage" ADD CONSTRAINT "CuerpoLinkMessage_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
