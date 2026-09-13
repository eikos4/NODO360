-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roles" "Role"[] DEFAULT ARRAY[]::"Role"[];

UPDATE "User"
SET "roles" = ARRAY["role"]::"Role"[]
WHERE "roles" IS NULL OR cardinality("roles") = 0;
