import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { number: 'asc' },
  });

  for (const c of companies) {
    const members = await prisma.user.findMany({
      where: { companyId: c.id, isActive: true, operativeNumber: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const used = new Set(
      (
        await prisma.user.findMany({
          where: { companyId: c.id, operativeNumber: { not: null } },
          select: { operativeNumber: true },
        })
      ).map((u) => u.operativeNumber!),
    );

    let n = 1;
    for (const m of members) {
      while (used.has(n) && n <= 999) n += 1;
      if (n > 999) break;
      await prisma.user.update({ where: { id: m.id }, data: { operativeNumber: n } });
      used.add(n);
      n += 1;
    }
    console.log(`Compañía ${c.number}: ${members.length} N° operativos asignados`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
