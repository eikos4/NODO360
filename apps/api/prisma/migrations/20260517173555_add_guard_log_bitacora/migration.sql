-- CreateEnum
CREATE TYPE "GuardLogStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "GuardLogEntryType" AS ENUM ('NOVEDAD', 'REVISION', 'VISITA', 'COMUNICACION', 'MANTENIMIENTO', 'OTRO');

-- CreateTable
CREATE TABLE "GuardLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "GuardLogStatus" NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "closingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardLogEntry" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "type" "GuardLogEntryType" NOT NULL DEFAULT 'NOVEDAD',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardHandover" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "observations" TEXT,
    "handedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardHandover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardLog_companyId_date_key" ON "GuardLog"("companyId", "date");

-- AddForeignKey
ALTER TABLE "GuardLog" ADD CONSTRAINT "GuardLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardLog" ADD CONSTRAINT "GuardLog_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardLogEntry" ADD CONSTRAINT "GuardLogEntry_logId_fkey" FOREIGN KEY ("logId") REFERENCES "GuardLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardLogEntry" ADD CONSTRAINT "GuardLogEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardHandover" ADD CONSTRAINT "GuardHandover_logId_fkey" FOREIGN KEY ("logId") REFERENCES "GuardLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardHandover" ADD CONSTRAINT "GuardHandover_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardHandover" ADD CONSTRAINT "GuardHandover_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
