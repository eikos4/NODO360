import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Coordenadas aproximadas del centro de Parral (Maule) */
const PARRAL_CENTER = { lat: -36.1431, lng: -71.8261 };

async function main() {
  let company = await prisma.company.findFirst({
    where: { city: 'Parral' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Cuerpo de Bomberos de Parral',
        number: 1,
        region: 'Maule',
        city: 'Parral',
        address: 'Calle Dieciocho 685',
        phone: '+56 73 246 2600',
        email: 'contacto@bomberosparral.cl',
        dispatchSlug: 'bomberos-parral',
        dispatchPublicEnabled: true,
      },
    });
  }

  const hydrantsData = [
    {
      code: 'H-001-PARRAL',
      type: 'COLUMNAR' as const,
      status: 'OPERATIVO' as const,
      diameter: 100,
      pressure: 60,
      flowRate: 1200,
      address: 'Calle Dieciocho 685',
      location: 'Frente al cuartel general',
      latitude: PARRAL_CENTER.lat + 0.0003,
      longitude: PARRAL_CENTER.lng + 0.0002,
      companyId: company.id,
      notes: 'Hidrante principal del cuartel',
    },
    {
      code: 'H-002-PARRAL',
      type: 'PIBA' as const,
      status: 'OPERATIVO' as const,
      diameter: 64,
      pressure: 55,
      flowRate: 800,
      address: 'Calle Arturo Prat 450',
      location: 'Esquina con Aníbal Pinto',
      latitude: PARRAL_CENTER.lat - 0.001,
      longitude: PARRAL_CENTER.lng + 0.0025,
      companyId: company.id,
      notes: 'Piba en zona comercial',
    },
    {
      code: 'H-003-PARRAL',
      type: 'COLUMNAR' as const,
      status: 'OPERATIVO' as const,
      diameter: 100,
      pressure: 58,
      flowRate: 1100,
      address: 'Plaza de Armas',
      location: 'Sector plaza de armas',
      latitude: PARRAL_CENTER.lat - 0.0004,
      longitude: PARRAL_CENTER.lng + 0.004,
      companyId: company.id,
      notes: 'Hidrante cerca de plaza',
    },
    {
      code: 'H-004-PARRAL',
      type: 'SUBTERRANEO' as const,
      status: 'NO_OPERATIVO' as const,
      diameter: 150,
      pressure: 0,
      flowRate: 0,
      address: 'Calle Victoria 1220',
      location: 'Sector hospital',
      latitude: PARRAL_CENTER.lat + 0.0015,
      longitude: PARRAL_CENTER.lng - 0.002,
      companyId: company.id,
      notes: 'En reparación — válvula dañada',
    },
    {
      code: 'H-005-PARRAL',
      type: 'PIBA' as const,
      status: 'OPERATIVO' as const,
      diameter: 64,
      pressure: 52,
      flowRate: 750,
      address: 'Calle Igualdad 345',
      location: '2ª Compañía',
      latitude: PARRAL_CENTER.lat - 0.0018,
      longitude: PARRAL_CENTER.lng + 0.0015,
      companyId: company.id,
      notes: 'Piba sector 2ª Compañía',
    },
    {
      code: 'H-006-PARRAL',
      type: 'COLUMNAR' as const,
      status: 'EN_MANTENCION' as const,
      diameter: 100,
      pressure: 45,
      flowRate: 900,
      address: 'Calle Bulnes 280',
      location: 'Sector sur',
      latitude: PARRAL_CENTER.lat - 0.003,
      longitude: PARRAL_CENTER.lng - 0.0005,
      companyId: company.id,
      notes: 'Mantención programada — revisión de válvulas',
    },
    {
      code: 'H-007-PARRAL',
      type: 'PIBA' as const,
      status: 'OPERATIVO' as const,
      diameter: 64,
      pressure: 60,
      flowRate: 850,
      address: 'Calle Serrano 80',
      location: 'Sector este',
      latitude: PARRAL_CENTER.lat + 0.0005,
      longitude: PARRAL_CENTER.lng + 0.0035,
      companyId: company.id,
      notes: 'Piba recién instalada',
    },
    {
      code: 'H-008-PARRAL',
      type: 'COLUMNAR' as const,
      status: 'OPERATIVO' as const,
      diameter: 100,
      pressure: 62,
      flowRate: 1150,
      address: 'Calle Matta 300',
      location: 'Cerca de colegio',
      latitude: PARRAL_CENTER.lat - 0.0008,
      longitude: PARRAL_CENTER.lng - 0.0015,
      companyId: company.id,
      notes: 'Hidrante en zona educacional',
    },
    {
      code: 'H-009-PARRAL',
      type: 'SUBTERRANEO' as const,
      status: 'OPERATIVO' as const,
      diameter: 150,
      pressure: 65,
      flowRate: 1500,
      address: 'Calle Freire 200',
      location: 'Acceso norte',
      latitude: PARRAL_CENTER.lat + 0.0025,
      longitude: PARRAL_CENTER.lng - 0.003,
      companyId: company.id,
      notes: 'Hidrante de alta capacidad',
    },
    {
      code: 'H-010-PARRAL',
      type: 'PIBA' as const,
      status: 'NO_OPERATIVO' as const,
      diameter: 64,
      pressure: 0,
      flowRate: 0,
      address: 'Calle Lautaro 400',
      location: 'Sector oeste',
      latitude: PARRAL_CENTER.lat + 0.001,
      longitude: PARRAL_CENTER.lng - 0.004,
      companyId: company.id,
      notes: 'Fuera de servicio — requiere reparación',
    },
  ];

  for (const hydrant of hydrantsData) {
    const existing = await prisma.hydrant.findUnique({
      where: { code: hydrant.code },
    });

    if (existing) {
      const { companyId, ...updateData } = hydrant;
      await prisma.hydrant.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      await prisma.hydrant.create({
        data: hydrant,
      });
    }
  }

  console.log(`✅ Se han cargado ${hydrantsData.length} hidrantes de prueba para Parral`);
  console.log(`📍 Compañía: ${company.name} (ID: ${company.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
