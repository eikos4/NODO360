-- AlterEnum
ALTER TYPE "AnnouncementType" ADD VALUE IF NOT EXISTS 'URGENT_NOTICE';
ALTER TYPE "AnnouncementType" ADD VALUE IF NOT EXISTS 'TRAINING';
ALTER TYPE "AnnouncementType" ADD VALUE IF NOT EXISTS 'CITATION';
ALTER TYPE "AnnouncementType" ADD VALUE IF NOT EXISTS 'SAFETY';
ALTER TYPE "AnnouncementType" ADD VALUE IF NOT EXISTS 'FLEET';
ALTER TYPE "AnnouncementType" ADD VALUE IF NOT EXISTS 'GUARD';
ALTER TYPE "AnnouncementType" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "AnnouncementType" ADD VALUE IF NOT EXISTS 'WELFARE';

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "targetCompanyIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "requireAck" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "pollQuestion" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "pollOptions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "pollClosesAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnnouncementReceipt" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackedAt" TIMESTAMP(3),

    CONSTRAINT "AnnouncementReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnnouncementVote" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnnouncementReceipt_announcementId_userId_key" ON "AnnouncementReceipt"("announcementId", "userId");
CREATE INDEX IF NOT EXISTS "AnnouncementReceipt_userId_idx" ON "AnnouncementReceipt"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "AnnouncementVote_announcementId_userId_key" ON "AnnouncementVote"("announcementId", "userId");
CREATE INDEX IF NOT EXISTS "AnnouncementVote_announcementId_idx" ON "AnnouncementVote"("announcementId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnnouncementReceipt_announcementId_fkey') THEN
    ALTER TABLE "AnnouncementReceipt"
      ADD CONSTRAINT "AnnouncementReceipt_announcementId_fkey"
      FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnnouncementReceipt_userId_fkey') THEN
    ALTER TABLE "AnnouncementReceipt"
      ADD CONSTRAINT "AnnouncementReceipt_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnnouncementVote_announcementId_fkey') THEN
    ALTER TABLE "AnnouncementVote"
      ADD CONSTRAINT "AnnouncementVote_announcementId_fkey"
      FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnnouncementVote_userId_fkey') THEN
    ALTER TABLE "AnnouncementVote"
      ADD CONSTRAINT "AnnouncementVote_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
