import { execSync } from 'child_process';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * Carga datos demo si la BD está vacía (p. ej. primer deploy en Render).
 * No borra datos existentes — seguro en redeploys.
 */
export async function ensureDemoDatabaseSeeded(): Promise<void> {
  if (process.env.AUTO_SEED_DEMO === 'false') return;

  const prisma = new PrismaClient();
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log('[bootstrap] BD con usuarios — seed demo omitido');
      return;
    }

    console.log('[bootstrap] BD vacía — ejecutando seed demo Parral...');
    const apiRoot = join(__dirname, '..');
    execSync('npm run seed -- --if-empty', {
      cwd: apiRoot,
      stdio: 'inherit',
      env: { ...process.env, SEED_IF_EMPTY: 'true' },
    });
    console.log('[bootstrap] Seed demo completado');
  } catch (err) {
    console.error('[bootstrap] Seed demo falló — el login no funcionará hasta poblar la BD:', err);
  } finally {
    await prisma.$disconnect();
  }
}
