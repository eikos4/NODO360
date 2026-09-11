import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PARRAL_COMPANIES, PARRAL_CUERPO } from '../onboarding/parral-cuerpo';

const DEMO_PASSWORD = 'Demo1234!';
const ADMIN_PASSWORD = 'Admin1234!';
const PARRAL_SLUG = 'bomberos-parral';

/** Crea el Cuerpo de Parral y sus 6 compañías si faltan. No borra datos. */
export async function ensureParralCuerpo(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const cuerpo = await prisma.cuerpo.upsert({
      where: { slug: PARRAL_SLUG },
      create: {
        name: PARRAL_CUERPO.bodyName,
        city: PARRAL_CUERPO.city,
        region: PARRAL_CUERPO.region,
        phone: PARRAL_CUERPO.phone,
        slug: PARRAL_SLUG,
      },
      update: {
        name: PARRAL_CUERPO.bodyName,
        city: PARRAL_CUERPO.city,
        region: PARRAL_CUERPO.region,
        isActive: true,
      },
    });

    let created = 0;
    let repaired = 0;

    for (const spec of PARRAL_COMPANIES) {
      const byNumber = await prisma.company.findUnique({
        where: { cuerpoId_number: { cuerpoId: cuerpo.id, number: spec.number } },
      });
      if (!byNumber) {
        const slugTaken = await prisma.company.findUnique({ where: { dispatchSlug: spec.dispatchSlug } });
        await prisma.company.create({
          data: {
            number: spec.number,
            name: spec.name,
            region: PARRAL_CUERPO.region,
            city: spec.city,
            address: spec.address,
            phone: PARRAL_CUERPO.phone,
            email: 'contacto@bomberosparral.cl',
            dispatchSlug: slugTaken ? `${spec.dispatchSlug}-${spec.number}` : spec.dispatchSlug,
            dispatchPublicEnabled: true,
            dispatchAvailable: true,
            cuerpoId: cuerpo.id,
          },
        });
        created += 1;
        continue;
      }

      const patch: {
        cuerpoId?: string;
        dispatchSlug?: string;
        dispatchPublicEnabled?: boolean;
        dispatchAvailable?: boolean;
      } = {};
      if (byNumber.cuerpoId !== cuerpo.id) patch.cuerpoId = cuerpo.id;
      if (!byNumber.dispatchSlug) {
        const slugTaken = await prisma.company.findUnique({ where: { dispatchSlug: spec.dispatchSlug } });
        if (!slugTaken) patch.dispatchSlug = spec.dispatchSlug;
      }
      if (!byNumber.dispatchPublicEnabled) patch.dispatchPublicEnabled = true;
      if (!byNumber.dispatchAvailable) patch.dispatchAvailable = true;
      if (Object.keys(patch).length) {
        await prisma.company.update({ where: { id: byNumber.id }, data: patch });
        repaired += 1;
      }
    }

    const usersCreated = await ensureParralPilotUsers(prisma, cuerpo.id);

    if (created > 0 || repaired > 0 || usersCreated > 0) {
      console.log(
        `[bootstrap] Parral: ${created} compañía(s) nuevas, ${repaired} sala(s) reparadas, ${usersCreated} usuario(s) piloto`,
      );
    } else {
      console.log('[bootstrap] Parral: Cuerpo + 6 compañías y usuarios piloto ya presentes');
    }
  } catch (err) {
    console.error('[bootstrap] No se pudieron asegurar las compañías de Parral:', err);
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureParralPilotUsers(prisma: PrismaClient, cuerpoId: string): Promise<number> {
  const companies = await prisma.company.findMany({
    where: { cuerpoId, number: { in: [...PARRAL_COMPANIES.map((c) => c.number)] } },
    orderBy: { number: 'asc' },
  });
  const byNumber = new Map(companies.map((c) => [c.number, c]));
  const first = byNumber.get(1);
  if (!first) return 0;

  const pwdDemo = await bcrypt.hash(DEMO_PASSWORD, 10);
  const pwdAdmin = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const staff: Array<{
    email: string;
    rut: string;
    firstName: string;
    lastName: string;
    role: Role;
    companyId: string;
    passwordHash: string;
  }> = [
    {
      email: 'admin@nodo360.cl',
      rut: '12.345.678-9',
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      role: Role.SUPER_ADMIN,
      companyId: first.id,
      passwordHash: pwdAdmin,
    },
    {
      email: 'gonzalez@bomberosparral.cl',
      rut: '13.456.789-0',
      firstName: 'Mario',
      lastName: 'González',
      role: Role.COMANDANTE,
      companyId: first.id,
      passwordHash: pwdDemo,
    },
    {
      email: 'central@bomberosparral.cl',
      rut: '39.012.345-6',
      firstName: 'Karen',
      lastName: 'Bravo',
      role: Role.OPERADOR_CENTRAL,
      companyId: first.id,
      passwordHash: pwdDemo,
    },
    {
      email: 'martinez@bomberosparral.cl',
      rut: '14.567.890-1',
      firstName: 'Ana',
      lastName: 'Martínez',
      role: Role.CAPITAN,
      companyId: first.id,
      passwordHash: pwdDemo,
    },
    {
      email: 'torres@bomberosparral.cl',
      rut: '16.789.012-3',
      firstName: 'Sofía',
      lastName: 'Torres',
      role: Role.TESORERO,
      companyId: first.id,
      passwordHash: pwdDemo,
    },
    {
      email: 'fuentes@bomberosparral.cl',
      rut: '18.901.234-5',
      firstName: 'Diego',
      lastName: 'Fuentes',
      role: Role.BOMBERO,
      companyId: first.id,
      passwordHash: pwdDemo,
    },
  ];

  const captains: Array<{ number: number; email: string; rut: string; firstName: string; lastName: string }> = [
    { number: 2, email: 'silva@bomberosparral.cl', rut: '24.567.890-1', firstName: 'Roberto', lastName: 'Silva' },
    { number: 3, email: 'ramirez@bomberosparral.cl', rut: '27.890.123-4', firstName: 'Claudia', lastName: 'Ramírez' },
    { number: 4, email: 'navarro@bomberosparral.cl', rut: '30.123.456-7', firstName: 'Héctor', lastName: 'Navarro' },
    { number: 5, email: 'espinoza@bomberosparral.cl', rut: '33.456.789-0', firstName: 'Ricardo', lastName: 'Espinoza' },
    { number: 6, email: 'caceres@bomberosparral.cl', rut: '36.789.012-3', firstName: 'Paula', lastName: 'Cáceres' },
  ];

  for (const cap of captains) {
    const company = byNumber.get(cap.number);
    if (!company) continue;
    staff.push({
      email: cap.email,
      rut: cap.rut,
      firstName: cap.firstName,
      lastName: cap.lastName,
      role: Role.CAPITAN,
      companyId: company.id,
      passwordHash: pwdDemo,
    });
  }

  let created = 0;
  for (const person of staff) {
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: person.email }, { rut: person.rut }] },
    });
    if (exists) continue;
    await prisma.user.create({ data: { ...person, isActive: true } });
    created += 1;
  }
  return created;
}
