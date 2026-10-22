-- Compañías de apoyo en el mismo despacho (sala de máquinas de cada una).
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "supportCompanyIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
