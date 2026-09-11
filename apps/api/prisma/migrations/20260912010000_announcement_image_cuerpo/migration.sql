-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "cuerpoId" TEXT;

-- Backfill from the author's company
UPDATE "Announcement" a
SET "cuerpoId" = c."cuerpoId"
FROM "Company" c
WHERE a."companyId" = c.id
  AND a."cuerpoId" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Announcement_cuerpoId_idx" ON "Announcement"("cuerpoId");
CREATE INDEX IF NOT EXISTS "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_cuerpoId_fkey'
  ) THEN
    ALTER TABLE "Announcement"
      ADD CONSTRAINT "Announcement_cuerpoId_fkey"
      FOREIGN KEY ("cuerpoId") REFERENCES "Cuerpo"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
