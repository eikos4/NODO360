import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const achievements = [
    {
      code: 'FIRST_RESPONDER',
      name: 'Primera Respuesta',
      description: 'Ha asistido a más de 10 emergencias.',
      icon: 'Siren',
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
    {
      code: 'NIGHT_OWL',
      name: 'Búho Nocturno',
      description: 'Ha asistido a una emergencia de madrugada (00:00 - 06:00).',
      icon: 'Moon',
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      code: 'VETERAN',
      name: 'Veterano 360',
      description: 'Tiene más de 50 asistencias registradas a emergencias.',
      icon: 'Shield',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      code: 'LIGHTNING',
      name: 'Relámpago',
      description: 'Llegada al lugar del incidente en tiempo récord (menos de 3 mins).',
      icon: 'Zap',
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
  ];

  console.log('Seeding achievements...');
  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: ach,
      create: ach,
    });
  }
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
