-- AlterTable
ALTER TABLE "User" ADD COLUMN "operativeNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_companyId_operativeNumber_key" ON "User"("companyId", "operativeNumber");

-- CreateIndex
CREATE INDEX "User_companyId_operativeNumber_idx" ON "User"("companyId", "operativeNumber");
