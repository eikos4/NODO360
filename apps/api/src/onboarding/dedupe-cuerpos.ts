import { PrismaClient } from '@prisma/client';

type PrismaLike = PrismaClient;

function norm(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isParralCuerpo(cuerpo: { slug: string; city: string; name: string }) {
  return (
    cuerpo.slug === 'bomberos-parral'
    || cuerpo.slug === 'cuerpo-de-bomberos-de-parral'
    || (norm(cuerpo.city).includes('parral') && norm(cuerpo.name).includes('parral'))
  );
}

function groupKey(cuerpo: { slug: string; city: string; name: string }) {
  if (isParralCuerpo(cuerpo)) return 'parral';
  return `${norm(cuerpo.city)}|${norm(cuerpo.name)}`;
}

/** Une Cuerpos duplicados (mismo nombre/ciudad, o varios Parral) en uno solo. */
export async function mergeDuplicateCuerpos(prisma: PrismaLike) {
  const cuerpos = await prisma.cuerpo.findMany({
    where: { isActive: true },
    include: { companies: { where: { isActive: true }, orderBy: { number: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map<string, typeof cuerpos>();
  for (const cuerpo of cuerpos) {
    const key = groupKey(cuerpo);
    const list = groups.get(key) ?? [];
    list.push(cuerpo);
    groups.set(key, list);
  }

  let merged = 0;

  for (const [key, list] of groups) {
    if (list.length < 2) continue;

    const keeper =
      (key === 'parral' ? list.find((c) => c.slug === 'bomberos-parral') : undefined)
      ?? list[0];
    const extras = list.filter((c) => c.id !== keeper.id);

    if (key === 'parral' && keeper.slug !== 'bomberos-parral') {
      const taken = await prisma.cuerpo.findUnique({ where: { slug: 'bomberos-parral' } });
      if (!taken) {
        await prisma.cuerpo.update({
          where: { id: keeper.id },
          data: {
            slug: 'bomberos-parral',
            name: 'Cuerpo de Bomberos de Parral',
            city: 'Parral',
            region: keeper.region || 'Maule',
          },
        });
      }
    }

    for (const extra of extras) {
      for (const company of extra.companies) {
        const sameNumber = keeper.companies.find((c) => c.number === company.number);
        if (sameNumber) {
          await prisma.user.updateMany({
            where: { companyId: company.id },
            data: { companyId: sameNumber.id },
          });
          await prisma.company.update({
            where: { id: company.id },
            data: { isActive: false },
          });
        } else {
          await prisma.company.update({
            where: { id: company.id },
            data: { cuerpoId: keeper.id },
          });
          keeper.companies.push({ ...company, cuerpoId: keeper.id });
        }
      }

      await prisma.platformLog.updateMany({
        where: { cuerpoId: extra.id },
        data: { cuerpoId: keeper.id },
      });
      await prisma.cuerpo.update({
        where: { id: extra.id },
        data: { isActive: false },
      });
      merged += 1;
    }
  }

  return merged;
}
