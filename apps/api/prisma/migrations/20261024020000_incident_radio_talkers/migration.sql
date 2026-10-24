-- Teléfonos autorizados por la centralista para hablar en el canal de la emergencia.
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "radioTalkerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
