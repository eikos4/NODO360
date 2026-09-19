import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, CUERPO_WIDE_ROLES, cuerpoIdForUser, isPlatformOwner, assertCompanyAccess } from '../common/cuerpo-scope';
import { assignedRoles, hasAnyRole, normalizePhone, pickPrimaryRole } from '../common/user-roles';
import { CreateUserDto, Role } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type UserActor = Actor & { id?: string };

const USER_SELECT = {
  id: true,
  rut: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  roles: true,
  companyId: true,
  isActive: true,
  photoUrl: true,
  operativeNumber: true,
  isMaquinista: true,
  maquinistaAvailable: true,
  maquinistaPrincipal: true,
  stationAvailable: true,
  stationAvailableAt: true,
  createdAt: true,
  company: { select: { id: true, name: true, number: true, cuerpoId: true, cuerpo: { select: { id: true, name: true } } } },
  achievements: {
    include: {
      achievement: true,
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId?: string, actor?: Actor) {
    if (actor && companyId) await assertCompanyAccess(this.prisma, actor, companyId);
    const where: Record<string, unknown> = companyId ? { companyId } : {};
    if (actor && !isPlatformOwner(actor.role, actor.roles) && !companyId) {
      if (!hasAnyRole(actor, ...CUERPO_WIDE_ROLES)) {
        if (!actor.companyId) throw new ForbiddenException('Usuario sin compañía asignada');
        where.companyId = actor.companyId;
      } else {
        const cuerpoId = await cuerpoIdForUser(this.prisma, actor);
        if (cuerpoId) where.company = { cuerpoId };
        else if (actor.companyId) where.companyId = actor.companyId;
        else throw new ForbiddenException('Usuario sin Cuerpo asignado');
      }
    }
    return this.prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: [{ operativeNumber: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findById(id: string, actor?: UserActor) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (actor) await this.assertCanAccessUser(user, actor);
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByLogin(identifier: string) {
    const raw = identifier.trim();
    if (!raw) return null;

    const byEmail = await this.prisma.user.findFirst({
      where: { email: { equals: raw.toLowerCase(), mode: 'insensitive' } },
    });
    if (byEmail) return byEmail;

    const exactRut = await this.prisma.user.findFirst({ where: { rut: raw } });
    if (exactRut) return exactRut;

    const rutNorm = raw.replace(/[^0-9kK]/g, '').toUpperCase();
    if (rutNorm.length < 7) return null;

    const matches = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "User"
      WHERE upper(regexp_replace(rut, '[^0-9Kk]', '', 'g')) = ${rutNorm}
      LIMIT 1
    `;
    if (!matches[0]) return null;
    return this.prisma.user.findUnique({ where: { id: matches[0].id } });
  }

  private async assertOperativeNumber(
    companyId: string | null | undefined,
    operativeNumber: number | null | undefined,
    excludeUserId?: string,
  ) {
    if (operativeNumber == null) return;
    const scopedCompanyId = companyId || null;
    const dup = await this.prisma.user.findFirst({
      where: {
        operativeNumber,
        companyId: scopedCompanyId,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
    if (dup) {
      throw new ConflictException(
        scopedCompanyId
          ? `El N° operativo ${operativeNumber} ya está asignado en esta compañía`
          : `El N° operativo ${operativeNumber} ya está asignado a un perfil sin compañía`,
      );
    }
  }

  private resolveRoles(role?: string | null, extra?: string[] | null, fallback?: string | null) {
    const assigned = assignedRoles(role, extra);
    if (!assigned.length && fallback) assigned.push(fallback);
    if (!assigned.length) {
      throw new BadRequestException('Asigná al menos un rol');
    }
    return {
      role: pickPrimaryRole(assigned) as Role,
      roles: assigned as Role[],
    };
  }

  private assertAssignable(assigned: { role: Role; roles: Role[] }, actor?: UserActor, companyId?: string | null) {
    if (!actor) return;
    if (assigned.roles.includes(Role.KODESK) && !hasAnyRole(actor, 'KODESK')) {
      throw new ForbiddenException('El perfil Kodesk solo lo asigna Kodesk');
    }
    if (assigned.roles.includes(Role.SUPER_ADMIN) && !hasAnyRole(actor, 'KODESK')) {
      throw new ForbiddenException('Solo Kodesk puede asignar Super Admin');
    }
    if (!isPlatformOwner(actor.role, actor.roles) && !companyId) {
      throw new ForbiddenException('Compañía requerida');
    }
  }

  async create(dto: CreateUserDto, actor?: UserActor) {
    const { password, role, roles, phone, companyId, ...rest } = dto;
    const assigned = this.resolveRoles(role, roles);
    this.assertAssignable(assigned, actor, companyId);
    if (companyId && actor) {
      await assertCompanyAccess(this.prisma, actor, companyId);
    }
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { rut: dto.rut }] },
    });
    if (exists) throw new ConflictException('Email o RUT ya registrado');
    await this.assertOperativeNumber(dto.companyId, dto.operativeNumber);
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        ...rest,
        ...assigned,
        companyId: companyId || null,
        phone: normalizePhone(phone),
        passwordHash,
      },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto, actor?: UserActor) {
    const current = await this.findById(id, actor);
    const { password, operativeNumber, role, roles, phone, companyId, isMaquinista, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (companyId !== undefined) {
      data.companyId = companyId || null;
    }

    if (role !== undefined || roles !== undefined) {
      const assigned = this.resolveRoles(
        role ?? (roles ? undefined : current.role),
        roles ?? current.roles,
        current.role,
      );
      this.assertAssignable(
        assigned,
        actor,
        (companyId !== undefined ? companyId || null : current.companyId) as string | null,
      );
      data.role = assigned.role;
      data.roles = assigned.roles;
    }
    if (phone !== undefined) {
      data.phone = normalizePhone(phone);
    }

    if (operativeNumber !== undefined) {
      if (operativeNumber != null && (operativeNumber < 1 || operativeNumber > 999)) {
        throw new BadRequestException('N° operativo debe ser entre 1 y 999');
      }
      data.operativeNumber = operativeNumber;
    }
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    if (isMaquinista !== undefined) {
      data.isMaquinista = isMaquinista;
      if (!isMaquinista) {
        data.maquinistaAvailable = false;
        data.maquinistaPrincipal = false;
      }
    }

    const nextCompanyId = (companyId !== undefined ? companyId || null : current.companyId) as string | null;
    if (actor && !isPlatformOwner(actor.role, actor.roles) && !nextCompanyId) {
      throw new ForbiddenException('Compañía requerida');
    }
    if (actor && nextCompanyId) {
      await assertCompanyAccess(this.prisma, actor, nextCompanyId);
    }
    const nextNumber =
      operativeNumber !== undefined ? operativeNumber : current.operativeNumber;
    await this.assertOperativeNumber(nextCompanyId, nextNumber ?? undefined, id);

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  private async assertCanAccessUser(
    target: { id: string; companyId?: string | null; role: string; roles?: string[] },
    actor: UserActor,
  ) {
    if (actor.id && actor.id === target.id) return;
    if (isPlatformOwner(actor.role, actor.roles)) return;
    if (target.companyId) {
      await assertCompanyAccess(this.prisma, actor, target.companyId);
      return;
    }
    if (!hasAnyRole(actor, 'SUPER_ADMIN', 'KODESK')) {
      throw new ForbiddenException('Sin permiso para este usuario');
    }
  }

  private assertCanManage(target: { id: string; role: string; roles?: string[] }, actor?: UserActor, mode: 'deactivate' | 'delete' = 'deactivate') {
    if (actor?.id && actor.id === target.id) {
      throw new ForbiddenException(mode === 'delete'
        ? 'No puedes eliminar tu propio perfil'
        : 'No puedes desactivar tu propio perfil');
    }
    if (hasAnyRole(target, 'KODESK')) {
      throw new ForbiddenException(mode === 'delete'
        ? 'El perfil Kodesk no se puede eliminar'
        : 'El perfil Kodesk no se puede desactivar');
    }
    if (mode === 'delete' && hasAnyRole(target, 'SUPER_ADMIN') && !hasAnyRole(actor, 'KODESK')) {
      throw new ForbiddenException('Solo Kodesk puede eliminar un Super Admin');
    }
  }

  async deactivate(id: string, actor?: UserActor) {
    const target = await this.findById(id, actor);
    this.assertCanManage(target, actor, 'deactivate');
    return this.prisma.user.update({ where: { id }, data: { isActive: false }, select: USER_SELECT });
  }

  async remove(id: string, actor?: UserActor) {
    const target = await this.findById(id, actor);
    this.assertCanManage(target, actor, 'delete');

    const fallbackId = actor?.id && actor.id !== id ? actor.id : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.vehicle.updateMany({ where: { principalMaquinistaId: id }, data: { principalMaquinistaId: null } });
      await tx.guardLog.updateMany({ where: { openedById: id }, data: { openedById: null } });
      await tx.inventoryAudit.updateMany({ where: { auditorId: id }, data: { auditorId: null } });
      await tx.emergencyBitacoraEntry.updateMany({ where: { authorId: id }, data: { authorId: null } });
      await tx.fleetLog.updateMany({ where: { driverId: id }, data: { driverId: null } });
      await tx.incidentParticipant.deleteMany({ where: { userId: id } });
      await tx.shift.deleteMany({ where: { userId: id } });
      await tx.socialContribution.deleteMany({ where: { userId: id } });

      if (fallbackId) {
        await tx.fleetLog.updateMany({ where: { registeredById: id }, data: { registeredById: fallbackId } });
        await tx.guardLogEntry.updateMany({ where: { authorId: id }, data: { authorId: fallbackId } });
        await tx.guardHandover.updateMany({ where: { fromUserId: id }, data: { fromUserId: fallbackId } });
        await tx.guardHandover.updateMany({ where: { toUserId: id }, data: { toUserId: fallbackId } });
      } else {
        await tx.fleetLog.deleteMany({ where: { registeredById: id } });
        await tx.guardLogEntry.deleteMany({ where: { authorId: id } });
        await tx.guardHandover.deleteMany({ where: { OR: [{ fromUserId: id }, { toUserId: id }] } });
      }

      await tx.user.delete({ where: { id } });
    });

    return {
      ok: true,
      deleted: id,
      name: `${target.firstName} ${target.lastName}`.trim(),
    };
  }
}
