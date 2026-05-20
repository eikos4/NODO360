-- CreateEnum
CREATE TYPE "CertificationCategory" AS ENUM ('LICENCIA', 'EPP', 'MEDICO', 'CURSO', 'HABILITACION', 'OTRO');

-- CreateTable
CREATE TABLE "MemberCertification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CertificationCategory" NOT NULL DEFAULT 'OTRO',
    "issuer" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberCertification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberCertification_companyId_idx" ON "MemberCertification"("companyId");

-- CreateIndex
CREATE INDEX "MemberCertification_userId_idx" ON "MemberCertification"("userId");

-- CreateIndex
CREATE INDEX "MemberCertification_expiresAt_idx" ON "MemberCertification"("expiresAt");

-- AddForeignKey
ALTER TABLE "MemberCertification" ADD CONSTRAINT "MemberCertification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCertification" ADD CONSTRAINT "MemberCertification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
