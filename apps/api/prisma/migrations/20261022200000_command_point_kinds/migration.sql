CREATE TYPE "CommandPointKind_new" AS ENUM (
  'ABASTECIMIENTO',
  'FUENTE_AGUA',
  'HIDRANTE',
  'SEGURIDAD',
  'PUESTO_MEDICO',
  'REHABILITACION',
  'HELIPUERTO',
  'EVACUACION',
  'PUNTO_ENCUENTRO',
  'ACCESO',
  'AREA_ESPERA',
  'PELIGRO',
  'CORTAFUEGO',
  'LOGISTICA',
  'COMUNICACIONES',
  'ALBERGUE',
  'OTRO'
);

ALTER TABLE "CommandPostPoint" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "CommandPostPoint"
  ALTER COLUMN "kind" TYPE "CommandPointKind_new"
  USING ("kind"::text::"CommandPointKind_new");

DROP TYPE "CommandPointKind";
ALTER TYPE "CommandPointKind_new" RENAME TO "CommandPointKind";
ALTER TABLE "CommandPostPoint" ALTER COLUMN "kind" SET DEFAULT 'OTRO';
