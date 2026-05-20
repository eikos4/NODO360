import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@nodo360.cl' } });
  if (existing) {
    console.log('Super Admin ya existe:', existing.email);
    return;
  }

  const passwordHash = await bcrypt.hash('Admin1234!', 10);

  const user = await prisma.user.create({
    data: {
      rut: '11.111.111-1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@nodo360.cl',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Super Admin creado:');
  console.log('   Email:     admin@nodo360.cl');
  console.log('   Password:  Admin1234!');
  console.log('   ID:', user.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
