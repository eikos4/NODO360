-- CreateEnum
CREATE TYPE "FleetLogType" AS ENUM ('COMBUSTIBLE', 'SERVICIO', 'OPERACION', 'OTRO');

-- CreateTable
CREATE TABLE "FleetLog" (
    "id" TEXT NOT NULL,
    "type" "FleetLogType" NOT NULL DEFAULT 'COMBUSTIBLE',
    "date" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT,
    "registeredById" TEXT NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "fuelLiters" DOUBLE PRECISION,
    "fuelCost" DOUBLE PRECISION,
    "fuelStation" TEXT,
    "fullTank" BOOLEAN NOT NULL DEFAULT false,
    "serviceLabel" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FleetLog_companyId_idx" ON "FleetLog"("companyId");

-- CreateIndex
CREATE INDEX "FleetLog_vehicleId_idx" ON "FleetLog"("vehicleId");

-- CreateIndex
CREATE INDEX "FleetLog_date_idx" ON "FleetLog"("date");

-- CreateIndex
CREATE INDEX "FleetLog_type_idx" ON "FleetLog"("type");

-- AddForeignKey
ALTER TABLE "FleetLog" ADD CONSTRAINT "FleetLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetLog" ADD CONSTRAINT "FleetLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetLog" ADD CONSTRAINT "FleetLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetLog" ADD CONSTRAINT "FleetLog_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
