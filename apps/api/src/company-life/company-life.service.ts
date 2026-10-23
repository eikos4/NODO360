import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, assertCompanyAccess, cuerpoIdForUser, isPlatformOwner } from '../common/cuerpo-scope';
import { hasAnyRole } from '../common/user-roles';
import { CreateLifeItemDto, LIFE_KINDS } from './dto/create-life-item.dto';
import { UpdateLifeItemDto } from './dto/update-life-item.dto';

const EDITORS = ['KODESK', 'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'] as const;
const PICKERS = ['KODESK', 'SUPER_ADMIN', 'COMANDANTE'] as const;

const USER_PUBLIC = {
  id: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  role: true,
  roles: true,
  operativeNumber: true,
  stationAvailable: true,
} as const;

type LifeDb = PrismaService & {
  companyLifeItem: {
    findMany: (args: unknown) => Promise<any[]>;
    findUnique: (args: unknown) => Promise<any>;
    create: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
    delete: (args: unknown) => Promise<any>;
  };
};

@Injectable()
export class CompanyLifeService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as LifeDb;
  }

  canPickCompany(actor: Actor) {
    return isPlatformOwner(actor.role, actor.roles) || hasAnyRole(actor, ...PICKERS);
  }

  canEdit(actor: Actor) {
    return isPlatformOwner(actor.role, actor.roles) || hasAnyRole(actor, ...EDITORS);
  }

  async resolveCompanyId(actor: Actor, requested?: string | null) {
    if (requested) {
      if (this.canPickCompany(actor) || actor.companyId === requested) {
        await assertCompanyAccess(this.prisma, actor, requested);
        return requested;
      }
      throw new ForbiddenException('Esta vista es privada de tu compañía');
    }
    if (actor.companyId) {
      await assertCompanyAccess(this.prisma, actor, actor.companyId);
      return actor.companyId;
    }
    return null;
  }

  async listVisibleCompanies(actor: Actor) {
    if (this.canPickCompany(actor)) {
      if (isPlatformOwner(actor.role, actor.roles)) {
        return this.prisma.company.findMany({
          where: { isActive: true },
          select: { id: true, name: true, number: true, city: true, logoUrl: true },
          orderBy: { number: 'asc' },
        });
      }
      const cuerpoId = await cuerpoIdForUser(this.prisma, actor);
      if (!cuerpoId) {
        if (!actor.companyId) return [];
        return this.prisma.company.findMany({
          where: { id: actor.companyId },
          select: { id: true, name: true, number: true, city: true, logoUrl: true },
        });
      }
      return this.prisma.company.findMany({
        where: { isActive: true, cuerpoId },
        select: { id: true, name: true, number: true, city: true, logoUrl: true },
        orderBy: { number: 'asc' },
      });
    }
    if (!actor.companyId) return [];
    return this.prisma.company.findMany({
      where: { id: actor.companyId },
      select: { id: true, name: true, number: true, city: true, logoUrl: true },
    });
  }

  async getBoard(actor: Actor, requestedCompanyId?: string | null) {
    const companyId = await this.resolveCompanyId(actor, requestedCompanyId);
    const companies = await this.listVisibleCompanies(actor);
    if (!companyId) {
      return {
        canEdit: this.canEdit(actor),
        canPickCompany: this.canPickCompany(actor),
        company: null,
        companies,
        stats: null,
        items: [],
        announcements: [],
        documents: [],
        members: [],
        vehicles: [],
      };
    }

    return this.loadBoard(companyId, {
      canEdit: this.canEdit(actor),
      canPickCompany: this.canPickCompany(actor),
      companies,
    });
  }

  async boardForCompany(companyId: string) {
    return this.loadBoard(companyId, { canEdit: true, canPickCompany: false, companies: [] });
  }

  private async loadBoard(
    companyId: string,
    opts: { canEdit: boolean; canPickCompany: boolean; companies: { id: string; name: string; number: number; city: string; logoUrl: string | null }[] },
  ) {
    const [company, items, announcements, documents, members, vehicles, equipmentCount] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          number: true,
          city: true,
          region: true,
          address: true,
          logoUrl: true,
          headquartersImageUrl: true,
        },
      }),
      this.db.companyLifeItem.findMany({
        where: { companyId },
        include: {
          assignee: { select: USER_PUBLIC },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.announcement.findMany({
        where: {
          isActive: true,
          OR: [{ companyId }, { targetCompanyIds: { has: companyId } }],
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          priority: true,
          eventDate: true,
          eventLocation: true,
          createdAt: true,
          imageUrl: true,
        },
      }),
      this.prisma.document.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, title: true, category: true, createdAt: true, fileUrl: true },
      }),
      this.prisma.user.findMany({
        where: { companyId, isActive: true },
        select: USER_PUBLIC,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.vehicle.findMany({
        where: { companyId },
        select: { id: true, brand: true, model: true, type: true, status: true, patent: true, imageUrl: true },
        orderBy: { patent: 'asc' },
      }),
      this.prisma.equipment.count({ where: { companyId } }),
    ]);

    if (!company) throw new NotFoundException('Compañía no encontrada');

    const inStation = members.filter((m) => m.stationAvailable).length;
    const openTasks = items.filter((i) => i.status !== 'DONE' && (i.kind === 'ASEO' || i.kind === 'TAREA')).length;

    return {
      canEdit: opts.canEdit,
      canPickCompany: opts.canPickCompany,
      company,
      companies: opts.companies,
      stats: {
        members: members.length,
        inStation,
        vehicles: vehicles.length,
        equipment: equipmentCount,
        openTasks,
        documents: documents.length,
      },
      items,
      announcements,
      documents,
      members,
      vehicles,
    };
  }

  private assertKind(kind: string) {
    if (!LIFE_KINDS.includes(kind as (typeof LIFE_KINDS)[number])) {
      throw new BadRequestException('Tipo de aviso no válido');
    }
  }

  async create(actor: Actor, dto: CreateLifeItemDto) {
    if (!this.canEdit(actor)) throw new ForbiddenException('Solo oficiales de la compañía pueden publicar');
    if (!actor.id) throw new ForbiddenException('Sesión inválida');
    this.assertKind(dto.kind);
    const companyId = await this.resolveCompanyId(actor, dto.companyId);
    if (!companyId) throw new BadRequestException('Compañía requerida');
    return this.insertItem(companyId, dto, actor.id);
  }

  async createInCompany(companyId: string, dto: CreateLifeItemDto, createdById: string) {
    this.assertKind(dto.kind);
    return this.insertItem(companyId, dto, createdById);
  }

  private async insertItem(companyId: string, dto: CreateLifeItemDto, createdById: string) {
    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.assigneeId, companyId, isActive: true },
        select: { id: true },
      });
      if (!assignee) throw new BadRequestException('El responsable no es de esta compañía');
    }
    return this.db.companyLifeItem.create({
      data: {
        companyId,
        kind: dto.kind,
        title: dto.title.trim(),
        notes: dto.notes?.trim() || null,
        priority: dto.priority ?? 'MEDIUM',
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        assigneeId: dto.assigneeId || null,
        createdById,
      },
      include: {
        assignee: { select: USER_PUBLIC },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  private async loadOwned(id: string, actor: Actor) {
    const item = await this.db.companyLifeItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Aviso no encontrado');
    await assertCompanyAccess(this.prisma, actor, item.companyId);
    if (actor.companyId && actor.companyId !== item.companyId && !this.canPickCompany(actor)) {
      throw new ForbiddenException('Esta vista es privada de tu compañía');
    }
    return item;
  }

  async update(id: string, actor: Actor, dto: UpdateLifeItemDto) {
    const item = await this.loadOwned(id, actor);
    const onlyStatus =
      dto.status &&
      Object.keys(dto).every((k) => k === 'status' || (dto as Record<string, unknown>)[k] === undefined);
    if (!this.canEdit(actor) && !onlyStatus) {
      throw new ForbiddenException('Solo oficiales de la compañía pueden editar');
    }
    if (dto.kind) this.assertKind(dto.kind);
    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.assigneeId, companyId: item.companyId, isActive: true },
        select: { id: true },
      });
      if (!assignee) throw new BadRequestException('El responsable no es de esta compañía');
    }
    return this.db.companyLifeItem.update({
      where: { id },
      data: {
        ...(dto.kind ? { kind: dto.kind } : {}),
        ...(dto.title != null ? { title: dto.title.trim() } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.dueAt !== undefined ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId || null } : {}),
      },
      include: {
        assignee: { select: USER_PUBLIC },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async remove(id: string, actor: Actor) {
    if (!this.canEdit(actor)) throw new ForbiddenException('Solo oficiales de la compañía pueden borrar');
    await this.loadOwned(id, actor);
    await this.db.companyLifeItem.delete({ where: { id } });
    return { ok: true };
  }

  async assertItemCompany(id: string, companyId: string) {
    const item = await this.db.companyLifeItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Aviso no encontrado');
    if (item.companyId !== companyId) throw new ForbiddenException('Esta vista es privada de tu compañía');
    return item;
  }

  async updateInCompany(id: string, companyId: string, dto: UpdateLifeItemDto) {
    await this.assertItemCompany(id, companyId);
    return this.update(id, { id: 'sala', companyId, role: 'CAPITAN' }, dto);
  }

  async removeInCompany(id: string, companyId: string) {
    await this.assertItemCompany(id, companyId);
    return this.remove(id, { id: 'sala', companyId, role: 'CAPITAN' });
  }
}
