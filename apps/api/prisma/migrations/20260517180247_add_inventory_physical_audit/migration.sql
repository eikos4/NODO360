-- CreateEnum
CREATE TYPE "InventoryAuditStatus" AS ENUM ('BORRADOR', 'EN_PROCESO', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "InventoryAuditItemKind" AS ENUM ('VEHICULO', 'EQUIPO');

-- CreateEnum
CREATE TYPE "InventoryAuditItemResult" AS ENUM ('PENDIENTE', 'CONFORME', 'NO_ENCONTRADO', 'DIFERENCIA', 'OBSERVACION');

-- CreateTable
CREATE TABLE "InventoryAudit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "status" "InventoryAuditStatus" NOT NULL DEFAULT 'BORRADOR',
    "companyId" TEXT NOT NULL,
    "auditorId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAuditItem" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "kind" "InventoryAuditItemKind" NOT NULL,
    "vehicleId" TEXT,
    "equipmentId" TEXT,
    "expectedLabel" TEXT NOT NULL,
    "expectedStatus" "EquipmentStatus",
    "expectedQty" INTEGER NOT NULL DEFAULT 1,
    "found" BOOLEAN,
    "physicalStatus" "EquipmentStatus",
    "physicalQty" INTEGER,
    "result" "InventoryAuditItemResult" NOT NULL DEFAULT 'PENDIENTE',
    "observations" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAuditItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAudit_code_key" ON "InventoryAudit"("code");

-- CreateIndex
CREATE INDEX "InventoryAudit_companyId_idx" ON "InventoryAudit"("companyId");

-- CreateIndex
CREATE INDEX "InventoryAudit_status_idx" ON "InventoryAudit"("status");

-- CreateIndex
CREATE INDEX "InventoryAuditItem_auditId_idx" ON "InventoryAuditItem"("auditId");

-- CreateIndex
CREATE INDEX "InventoryAuditItem_result_idx" ON "InventoryAuditItem"("result");

-- AddForeignKey
ALTER TABLE "InventoryAudit" ADD CONSTRAINT "InventoryAudit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAudit" ADD CONSTRAINT "InventoryAudit_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAuditItem" ADD CONSTRAINT "InventoryAuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "InventoryAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAuditItem" ADD CONSTRAINT "InventoryAuditItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAuditItem" ADD CONSTRAINT "InventoryAuditItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
