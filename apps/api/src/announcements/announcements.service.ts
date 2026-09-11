import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

export type AnnouncementActor = {
  id: string;
  role?: string;
  companyId?: string | null;
  cuerpoId?: string | null;
};

const OFFICER_ROLES = new Set([
  'KODESK',
  'SUPER_ADMIN',
  'COMANDANTE',
  'CAPITAN',
  'SECRETARIO',
  'OPERADOR_CENTRAL',
]);

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  private isPlatform(role?: string) {
    return role === 'KODESK';
  }

  private async resolveCuerpoId(actor: AnnouncementActor): Promise<string | null> {
    if (actor.cuerpoId) return actor.cuerpoId;
    if (!actor.companyId) return null;
    const company = await this.prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { cuerpoId: true },
    });
    return company?.cuerpoId ?? null;
  }

  private async assertAccess(id: string, actor: AnnouncementActor) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Anuncio no encontrado');
    if (this.isPlatform(actor.role)) return announcement;
    const cuerpoId = await this.resolveCuerpoId(actor);
    if (announcement.cuerpoId && cuerpoId && announcement.cuerpoId !== cuerpoId) {
      throw new ForbiddenException('Sin permiso para este comunicado');
    }
    return announcement;
  }

  private async withPublishers<T extends { publishedBy: string }>(rows: T[]) {
    const ids = [...new Set(rows.map((row) => row.publishedBy))];
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
      : [];
    const byId = new Map(users.map((user) => [user.id, user]));
    return rows.map((row) => {
      const user = byId.get(row.publishedBy);
      return {
        ...row,
        publisher: user
          ? { firstName: user.firstName, lastName: user.lastName, role: user.role }
          : { firstName: row.publishedBy, lastName: '', role: '' },
      };
    });
  }

  async findAll(
    actor: AnnouncementActor,
    filters?: { type?: string; priority?: string; targetAudience?: string },
  ) {
    const now = new Date();
    const where: Prisma.AnnouncementWhereInput = {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    if (filters?.type) where.type = filters.type as Prisma.AnnouncementWhereInput['type'];
    if (filters?.priority) where.priority = filters.priority as Prisma.AnnouncementWhereInput['priority'];
    if (filters?.targetAudience) {
      where.targetAudience = filters.targetAudience as Prisma.AnnouncementWhereInput['targetAudience'];
    }

    if (!this.isPlatform(actor.role)) {
      const cuerpoId = await this.resolveCuerpoId(actor);
      if (!cuerpoId) return [];
      where.cuerpoId = cuerpoId;
      if (!OFFICER_ROLES.has(actor.role ?? '')) {
        where.targetAudience = { in: ['ALL', 'ALL_PERSONNEL'] };
      }
    }

    const announcements = await this.prisma.announcement.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
    });
    return this.withPublishers(announcements);
  }

  async findOne(id: string, actor: AnnouncementActor) {
    const announcement = await this.assertAccess(id, actor);
    const [withPublisher] = await this.withPublishers([announcement]);
    return withPublisher;
  }

  async create(dto: CreateAnnouncementDto, actor: AnnouncementActor) {
    const cuerpoId = dto.companyId
      ? (await this.prisma.company.findUnique({
          where: { id: dto.companyId },
          select: { cuerpoId: true },
        }))?.cuerpoId ?? (await this.resolveCuerpoId(actor))
      : await this.resolveCuerpoId(actor);

    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        priority: dto.priority,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        eventLocation: dto.eventLocation || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
        targetAudience: dto.targetAudience,
        attachments: dto.attachments ?? [],
        imageUrl: dto.imageUrl || null,
        companyId: dto.companyId || actor.companyId || null,
        cuerpoId,
        publishedBy: actor.id,
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto, actor: AnnouncementActor) {
    await this.assertAccess(id, actor);

    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        priority: dto.priority,
        eventDate: dto.eventDate === '' ? null : dto.eventDate ? new Date(dto.eventDate) : undefined,
        eventLocation: dto.eventLocation,
        expiresAt: dto.expiresAt === '' ? null : dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        isActive: dto.isActive,
        targetAudience: dto.targetAudience,
        attachments: dto.attachments,
        imageUrl: dto.imageUrl === '' ? null : dto.imageUrl,
        companyId: dto.companyId,
      },
    });
  }

  async remove(id: string, actor: AnnouncementActor) {
    await this.assertAccess(id, actor);
    return this.prisma.announcement.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
