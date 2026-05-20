-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN');

CREATE TYPE "MedicalExamType" AS ENUM ('LABORATORIO', 'IMAGENOLOGIA', 'CARDIOLOGICO', 'OFTALMOLOGICO', 'AUDITIVO', 'PSICOMETRICO', 'FISICO', 'OTRO');

CREATE TYPE "MedicalExamStatus" AS ENUM ('PROGRAMADO', 'COMPLETADO', 'RESULTADO_PENDIENTE', 'ANORMAL', 'NORMAL');

CREATE TYPE "HealthConditionSeverity" AS ENUM ('LEVE', 'MODERADO', 'SEVERO', 'CRITICO');

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" TEXT NOT NULL,
    "bloodType" "BloodType" NOT NULL DEFAULT 'UNKNOWN',
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "chronicDiseases" TEXT,
    "surgeries" TEXT,
    "notes" TEXT,
    "lastCheckupAt" TIMESTAMP(3),
    "nextCheckupAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicalExam" (
    "id" TEXT NOT NULL,
    "type" "MedicalExamType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "examDate" TIMESTAMP(3) NOT NULL,
    "result" TEXT,
    "status" "MedicalExamStatus" NOT NULL DEFAULT 'PROGRAMADO',
    "fileUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "healthRecordId" TEXT NOT NULL,

    CONSTRAINT "MedicalExam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicalCondition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "diagnosedAt" TIMESTAMP(3),
    "severity" "HealthConditionSeverity" NOT NULL DEFAULT 'MODERADO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "healthRecordId" TEXT NOT NULL,

    CONSTRAINT "MedicalCondition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Allergy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "severity" TEXT,
    "reaction" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "healthRecordId" TEXT NOT NULL,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "healthRecordId" TEXT NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vaccination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vaccineType" TEXT,
    "dose" TEXT,
    "administeredAt" TIMESTAMP(3),
    "nextDoseAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "healthRecordId" TEXT NOT NULL,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthRecord_userId_key" ON "HealthRecord"("userId");
CREATE INDEX "HealthRecord_userId_idx" ON "HealthRecord"("userId");
CREATE INDEX "HealthRecord_companyId_idx" ON "HealthRecord"("companyId");

CREATE INDEX "MedicalExam_healthRecordId_idx" ON "MedicalExam"("healthRecordId");
CREATE INDEX "MedicalExam_examDate_idx" ON "MedicalExam"("examDate");
CREATE INDEX "MedicalExam_status_idx" ON "MedicalExam"("status");

CREATE INDEX "MedicalCondition_healthRecordId_idx" ON "MedicalCondition"("healthRecordId");
CREATE INDEX "MedicalCondition_isActive_idx" ON "MedicalCondition"("isActive");

CREATE INDEX "Allergy_healthRecordId_idx" ON "Allergy"("healthRecordId");
CREATE INDEX "Allergy_isActive_idx" ON "Allergy"("isActive");

CREATE INDEX "Medication_healthRecordId_idx" ON "Medication"("healthRecordId");
CREATE INDEX "Medication_isActive_idx" ON "Medication"("isActive");

CREATE INDEX "Vaccination_healthRecordId_idx" ON "Vaccination"("healthRecordId");
CREATE INDEX "Vaccination_administeredAt_idx" ON "Vaccination"("administeredAt");

-- AddForeignKey
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicalExam" ADD CONSTRAINT "MedicalExam_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalCondition" ADD CONSTRAINT "MedicalCondition_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Allergy" ADD CONSTRAINT "Allergy_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
