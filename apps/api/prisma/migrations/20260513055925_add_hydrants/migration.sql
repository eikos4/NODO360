-- CreateEnum
CREATE TYPE "HydrantType" AS ENUM ('PIBA', 'COLUMNAR', 'SUBTERRANEO', 'OTRO');

-- CreateEnum
CREATE TYPE "HydrantStatus" AS ENUM ('OPERATIVO', 'NO_OPERATIVO', 'EN_MANTENCION');

-- CreateTable
CREATE TABLE "Hydrant" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "HydrantType" NOT NULL DEFAULT 'COLUMNAR',
    "status" "HydrantStatus" NOT NULL DEFAULT 'OPERATIVO',
    "diameter" INTEGER,
    "pressure" DOUBLE PRECISION,
    "flowRate" DOUBLE PRECISION,
    "address" TEXT NOT NULL,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "lastInspectionAt" TIMESTAMP(3),
    "nextInspectionAt" TIMESTAMP(3),
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hydrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hydrant_code_key" ON "Hydrant"("code");

-- AddForeignKey
ALTER TABLE "Hydrant" ADD CONSTRAINT "Hydrant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
