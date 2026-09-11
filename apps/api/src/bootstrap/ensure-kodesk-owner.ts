import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const KODESK_EMAIL = 'nodo360@kodesk.cl';
const KODESK_PASSWORD = 'Kodesk360!';
const KODESK_RUT = '77.KDSK.001-K';

async function roleHasKodesk(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'Role' AND e.enumlabel = 'KODESK'
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

/** Crea o repara el dueño Kodesk. No borra el resto de la BD. */
export async function ensureKodeskOwner(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    if (!(await roleHasKodesk(prisma))) {
      await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'KODESK'`);
      await prisma.$disconnect();
    }
  } catch (err) {
    console.error('[bootstrap] No se pudo agregar Role.KODESK:', err);
    await prisma.$disconnect();
  }

  const db = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(KODESK_PASSWORD, 10);
    const existing = await db.user.findUnique({ where: { email: KODESK_EMAIL } });

    if (existing) {
      await db.$executeRaw`
        UPDATE "User"
        SET role = 'KODESK'::"Role",
            "isActive" = true,
            "companyId" = NULL,
            "passwordHash" = ${passwordHash},
            "updatedAt" = NOW()
        WHERE email = ${KODESK_EMAIL}
      `;
      console.log('[bootstrap] Dueño Kodesk actualizado: nodo360@kodesk.cl');
      return;
    }

    const rutTaken = await db.user.findUnique({ where: { rut: KODESK_RUT } });
    const rut = rutTaken ? `77.KDSK.${Date.now().toString().slice(-6)}-K` : KODESK_RUT;

    await db.$executeRaw`
      INSERT INTO "User" (
        id, rut, "firstName", "lastName", email, "passwordHash",
        role, "isActive", "createdAt", "updatedAt"
      ) VALUES (
        ${`kodesk_${randomUUID()}`},
        ${rut},
        'Kodesk',
        'Platform',
        ${KODESK_EMAIL},
        ${passwordHash},
        'KODESK'::"Role",
        true,
        NOW(),
        NOW()
      )
    `;
    console.log('[bootstrap] Dueño Kodesk creado: nodo360@kodesk.cl');
  } catch (err) {
    console.error('[bootstrap] No se pudo asegurar el usuario Kodesk:', err);
  } finally {
    await db.$disconnect();
  }
}
