import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Buscar o crear una compañía para Parral
  let company = await prisma.company.findFirst({
    where: { city: 'Parral' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Quinta Compañía de Bomberos Parral',
        number: 5,
        region: 'Maule',
        city: 'Parral',
        address: 'Av. Libertador Bernardo O\'Higgins 123',
        phone: '+56 2 2345 6789',
        email: 'quinta@bomberos.cl',
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
      address: 'Av. Libertador O\'Higgins 100',
      location: 'Frente al cuartel de bomberos',
      latitude: -35.6632,
      longitude: -71.4392,
      companyId: company.id,
      notes: 'Hidrante principal del centro',
    },
    {
      code: 'H-002-PARRAL',
      type: 'PIBA' as const,
      status: 'OPERATIVO' as const,
      diameter: 64,
      pressure: 55,
      flowRate: 800,
      address: 'Calle Arturo Prat 450',
      location: 'Esquina con Calle San Martín',
      latitude: -35.6650,
      longitude: -71.4410,
      companyId: company.id,
      notes: 'Piba en zona residencial',
    },
    {
      code: 'H-003-PARRAL',
      type: 'COLUMNAR' as const,
      status: 'OPERATIVO' as const,
      diameter: 100,
      pressure: 58,
      flowRate: 1100,
      address: 'Calle San Martín 200',
      location: 'Cerca de la plaza de armas',
      latitude: -35.6640,
      longitude: -71.4380,
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
      address: 'Calle Bulnes 350',
      location: 'Sector norte',
      latitude: -35.6670,
      longitude: -71.4420,
      companyId: company.id,
      notes: 'En reparación - válvula dañada',
    },
    {
      code: 'H-005-PARRAL',
      type: 'PIBA' as const,
      status: 'OPERATIVO' as const,
      diameter: 64,
      pressure: 52,
      flowRate: 750,
      address: 'Calle Maipú 150',
      location: 'Sector sur',
      latitude: -35.6620,
      longitude: -71.4370,
      companyId: company.id,
      notes: 'Piba en sector comercial',
    },
    {
      code: 'H-006-PARRAL',
      type: 'COLUMNAR' as const,
      status: 'EN_MANTENCION' as const,
      diameter: 100,
      pressure: 45,
      flowRate: 900,
      address: 'Calle O\'Higgins 500',
      location: 'Cerca del hospital',
      latitude: -35.6660,
      longitude: -71.4400,
      companyId: company.id,
      notes: 'Mantención programada - revisión de válvulas',
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
      latitude: -35.6635,
      longitude: -71.4365,
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
      location: 'Cerca de la escuela',
      latitude: -35.6645,
      longitude: -71.4395,
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
      location: 'Acceso principal norte',
      latitude: -35.6680,
      longitude: -71.4430,
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
      latitude: -35.6615,
      longitude: -71.4385,
      companyId: company.id,
      notes: 'Fuera de servicio - requiere reparación',
    },
  ];

  // Insertar hidrantes
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
