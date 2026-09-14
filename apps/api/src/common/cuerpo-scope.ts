import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hasAnyRole } from './user-roles';

export type Actor = {
  id?: string;
  role?: string;
  roles?: string[] | null;
  companyId?: string | null;
  cuerpoId?: string | null;
};

export const CUERPO_WIDE_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'OPERADOR_CENTRAL'] as const;

export function isPlatformOwner(role?: string | null, roles?: string[] | null) {
  return role === 'KODESK' || (roles ?? []).includes('KODESK');
}

export async function cuerpoIdForUser(
  prisma: PrismaService,
  user: Actor,
): Promise<string | null> {
  if (user.cuerpoId) return user.cuerpoId;
  if (!user.companyId) return null;
  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { cuerpoId: true },
  });
  return company?.cuerpoId ?? null;
}

export async function assertCompanyAccess(
  prisma: PrismaService,
  actor: Actor,
  companyId: string | null | undefined,
) {
  if (!companyId) throw new ForbiddenException('Compañía requerida');
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, cuerpoId: true },
  });
  if (!company) throw new NotFoundException('Compañía no encontrada');
  if (isPlatformOwner(actor.role, actor.roles)) return company;
  if (actor.companyId === companyId) return company;
  if (hasAnyRole(actor, ...CUERPO_WIDE_ROLES)) {
    const cuerpoId = await cuerpoIdForUser(prisma, actor);
    if (!cuerpoId && hasAnyRole(actor, 'SUPER_ADMIN')) return company;
    if (cuerpoId && cuerpoId === company.cuerpoId) return company;
  }
  throw new ForbiddenException('Sin permiso para esta compañía');
}

/** `null` = sin filtro (Kodesk). Si no, lista de compañías visibles. */
export async function companyIdsForActor(
  prisma: PrismaService,
  actor: Actor,
  requestedCompanyId?: string | null,
): Promise<string[] | null> {
  if (requestedCompanyId) {
    await assertCompanyAccess(prisma, actor, requestedCompanyId);
    return [requestedCompanyId];
  }
  if (isPlatformOwner(actor.role, actor.roles)) return null;
  if (hasAnyRole(actor, ...CUERPO_WIDE_ROLES)) {
    const cuerpoId = await cuerpoIdForUser(prisma, actor);
    if (!cuerpoId) {
      if (hasAnyRole(actor, 'SUPER_ADMIN')) return null;
      if (actor.companyId) return [actor.companyId];
      throw new ForbiddenException('Usuario sin Cuerpo asignado');
    }
    const companies = await prisma.company.findMany({
      where: { cuerpoId, isActive: true },
      select: { id: true },
    });
    return companies.map((row) => row.id);
  }
  if (!actor.companyId) throw new ForbiddenException('Usuario sin compañía asignada');
  return [actor.companyId];
}

export function companyIdWhere(ids: string[] | null): { companyId?: string | { in: string[] } } {
  if (ids == null) return {};
  if (ids.length === 1) return { companyId: ids[0] };
  return { companyId: { in: ids } };
}
