import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const KODESK_EMAIL = 'nodo360@kodesk.cl';
const KODESK_PASSWORD = 'Kodesk360!';

/** Crea el dueño de plataforma Kodesk si no existe. No toca el resto de la BD. */
export async function ensureKodeskOwner(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const exists = await prisma.user.findUnique({ where: { email: KODESK_EMAIL } });
    if (exists) {
      if (exists.role !== Role.KODESK) {
        await prisma.user.update({
          where: { id: exists.id },
          data: { role: Role.KODESK, companyId: null, isActive: true },
        });
        console.log('[bootstrap] nodo360@kodesk.cl promovido a KODESK');
      }
      return;
    }

    await prisma.user.create({
      data: {
        rut: '77.111.222-3',
        firstName: 'Kodesk',
        lastName: 'Platform',
        email: KODESK_EMAIL,
        passwordHash: await bcrypt.hash(KODESK_PASSWORD, 10),
        role: Role.KODESK,
        isActive: true,
      },
    });
    console.log('[bootstrap] Dueño Kodesk creado: nodo360@kodesk.cl');
  } catch (err) {
    console.error('[bootstrap] No se pudo asegurar el usuario Kodesk:', err);
  } finally {
    await prisma.$disconnect();
  }
}
