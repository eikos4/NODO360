/**
 * Activa vista pública y slugs de las 6 compañías Parral (sin borrar datos).
 * Uso: npm run repair:dispatch-public
 */
import { PrismaClient } from '@prisma/client';

const SLUGS: Record<number, string> = {
  1: 'bomberos-parral',
  2: 'parral-segunda',
  3: 'parral-tercera',
  4: 'parral-cuarta',
  5: 'parral-quinta-catillo',
  6: 'parral-sexta-remulcao',
};

async function main() {
  const prisma = new PrismaClient();
  for (const [num, slug] of Object.entries(SLUGS)) {
    const number = Number(num);
    await prisma.company.update({
      where: { number },
      data: {
        dispatchSlug: slug,
        dispatchPublicEnabled: true,
        dispatchAvailable: true,
      },
    });
    console.log(`✅ ${number}ª → /central/${slug}`);
  }
  await prisma.$disconnect();
  console.log('\nVistas públicas listas.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
