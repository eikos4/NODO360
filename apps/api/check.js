const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const u = await prisma.user.findFirst({ where: { operativeNumber: 516 } });
  console.log(u);
}
main().finally(() => prisma.$disconnect());
