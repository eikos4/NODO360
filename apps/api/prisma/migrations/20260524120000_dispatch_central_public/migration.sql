-- AlterTable
ALTER TABLE "Company" ADD COLUMN "dispatchSlug" TEXT;
ALTER TABLE "Company" ADD COLUMN "dispatchPublicEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "dispatchAvailable" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "Company_dispatchSlug_key" ON "Company"("dispatchSlug");
