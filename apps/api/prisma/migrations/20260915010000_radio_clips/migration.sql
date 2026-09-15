-- CreateTable
CREATE TABLE IF NOT EXISTS "RadioClip" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speakerName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "audioUrl" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadioClip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RadioClip_channelId_createdAt_idx" ON "RadioClip"("channelId", "createdAt");
