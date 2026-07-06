import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ take: 5 });
  const achievements = await prisma.achievement.findMany();

  if (users.length === 0 || achievements.length === 0) {
    console.log('No users or achievements found');
    return;
  }

  for (const user of users) {
    // Award 2 random medals
    for (let i = 0; i < 2; i++) {
      const ach = achievements[Math.floor(Math.random() * achievements.length)];
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId: user.id, achievementId: ach.id } },
        update: {},
        create: {
          userId: user.id,
          achievementId: ach.id,
        },
      });
    }
    console.log(`Awarded medals to ${user.firstName} ${user.lastName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
