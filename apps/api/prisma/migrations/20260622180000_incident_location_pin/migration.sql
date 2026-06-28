-- Pin GPS público para emergencias (link WhatsApp)
ALTER TABLE "Incident" ADD COLUMN "locationPinToken" TEXT;
ALTER TABLE "Incident" ADD COLUMN "locationPinAt" TIMESTAMP(3);
ALTER TABLE "Incident" ADD COLUMN "confirmedLatitude" DOUBLE PRECISION;
ALTER TABLE "Incident" ADD COLUMN "confirmedLongitude" DOUBLE PRECISION;
ALTER TABLE "Incident" ADD COLUMN "locationPinNote" TEXT;

CREATE UNIQUE INDEX "Incident_locationPinToken_key" ON "Incident"("locationPinToken");
