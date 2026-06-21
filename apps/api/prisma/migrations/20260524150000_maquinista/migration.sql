-- AlterTable
ALTER TABLE "User" ADD COLUMN "isMaquinista" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "maquinistaAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "maquinistaPrincipal" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Vehicle" ADD COLUMN "principalMaquinistaId" TEXT;

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_principalMaquinistaId_fkey" FOREIGN KEY ("principalMaquinistaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_companyId_isMaquinista_idx" ON "User"("companyId", "isMaquinista");
CREATE INDEX "Vehicle_principalMaquinistaId_idx" ON "Vehicle"("principalMaquinistaId");
