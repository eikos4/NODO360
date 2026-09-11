import { PrismaService } from '../prisma/prisma.service';

export type Actor = { role?: string; companyId?: string | null };

export function isPlatformOwner(role?: string | null) {
  return role === 'KODESK';
}

export async function cuerpoIdForUser(
  prisma: PrismaService,
  user: Actor,
): Promise<string | null> {
  if (!user.companyId) return null;
  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { cuerpoId: true },
  });
  return company?.cuerpoId ?? null;
}
