CREATE TYPE "AlarmDeliveryStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'SENT',
  'FAILED',
  'EXPIRED',
  'OPENED',
  'ACKNOWLEDGED'
);

CREATE TABLE "AlarmNotification" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT,
  "eventType" TEXT NOT NULL,
  "dedupKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "status" "AlarmDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AlarmNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlarmDelivery" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "deviceId" TEXT,
  "userId" TEXT NOT NULL,
  "tokenSnapshot" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "status" "AlarmDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AlarmDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlarmDeliveryHistory" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "status" "AlarmDeliveryStatus" NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlarmDeliveryHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlarmNotification_dedupKey_key" ON "AlarmNotification"("dedupKey");
CREATE INDEX "AlarmNotification_incidentId_createdAt_idx" ON "AlarmNotification"("incidentId", "createdAt");
CREATE INDEX "AlarmNotification_status_expiresAt_idx" ON "AlarmNotification"("status", "expiresAt");
CREATE UNIQUE INDEX "AlarmDelivery_notificationId_deviceId_key" ON "AlarmDelivery"("notificationId", "deviceId");
CREATE INDEX "AlarmDelivery_status_nextAttemptAt_idx" ON "AlarmDelivery"("status", "nextAttemptAt");
CREATE INDEX "AlarmDelivery_userId_createdAt_idx" ON "AlarmDelivery"("userId", "createdAt");
CREATE INDEX "AlarmDelivery_notificationId_status_idx" ON "AlarmDelivery"("notificationId", "status");
CREATE INDEX "AlarmDeliveryHistory_deliveryId_createdAt_idx" ON "AlarmDeliveryHistory"("deliveryId", "createdAt");

ALTER TABLE "AlarmNotification"
  ADD CONSTRAINT "AlarmNotification_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AlarmDelivery"
  ADD CONSTRAINT "AlarmDelivery_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "AlarmNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlarmDelivery"
  ADD CONSTRAINT "AlarmDelivery_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "DevicePushToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AlarmDelivery"
  ADD CONSTRAINT "AlarmDelivery_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlarmDeliveryHistory"
  ADD CONSTRAINT "AlarmDeliveryHistory_deliveryId_fkey"
  FOREIGN KEY ("deliveryId") REFERENCES "AlarmDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
