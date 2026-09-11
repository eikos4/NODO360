-- Multi-cuerpo: 8 Cuerpos pueden tener 1ª–6ª al mismo tiempo.
CREATE TABLE IF NOT EXISTS "Cuerpo" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "phone" TEXT,
  "slug" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cuerpo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Cuerpo_slug_key" ON "Cuerpo"("slug");

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "cuerpoId" TEXT;

INSERT INTO "Cuerpo" ("id", "name", "city", "region", "phone", "slug", "isActive", "createdAt", "updatedAt")
SELECT 'cuerpo_parral_demo', 'Cuerpo de Bomberos de Parral', 'Parral', 'Maule', '+56 73 246 2600', 'bomberos-parral', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Cuerpo" WHERE "slug" = 'bomberos-parral');

UPDATE "Company"
SET "cuerpoId" = (SELECT "id" FROM "Cuerpo" WHERE "slug" = 'bomberos-parral' LIMIT 1)
WHERE "cuerpoId" IS NULL;

ALTER TABLE "Company" ALTER COLUMN "cuerpoId" SET NOT NULL;

ALTER TABLE "Company" DROP CONSTRAINT IF EXISTS "Company_number_key";
DROP INDEX IF EXISTS "Company_number_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Company_cuerpoId_number_key" ON "Company"("cuerpoId", "number");
CREATE INDEX IF NOT EXISTS "Company_cuerpoId_idx" ON "Company"("cuerpoId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Company_cuerpoId_fkey'
  ) THEN
    ALTER TABLE "Company"
    ADD CONSTRAINT "Company_cuerpoId_fkey"
    FOREIGN KEY ("cuerpoId") REFERENCES "Cuerpo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformLog" (
  "id" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "detail" JSONB,
  "cuerpoId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformLog_createdAt_idx" ON "PlatformLog"("createdAt");
CREATE INDEX IF NOT EXISTS "PlatformLog_level_createdAt_idx" ON "PlatformLog"("level", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PlatformLog_cuerpoId_fkey'
  ) THEN
    ALTER TABLE "PlatformLog"
    ADD CONSTRAINT "PlatformLog_cuerpoId_fkey"
    FOREIGN KEY ("cuerpoId") REFERENCES "Cuerpo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "User_operativeNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_companyId_operativeNumber_key" ON "User"("companyId", "operativeNumber");
