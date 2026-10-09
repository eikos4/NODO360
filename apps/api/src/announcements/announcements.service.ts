import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPlatformOwner } from '../common/cuerpo-scope';
import { hasAnyRole } from '../common/user-roles';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { PushService } from '../notifications/push.service';

export type AnnouncementActor = {
  id: string;
  role?: string;
  roles?: string[] | null;
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

type AudienceUser = {
  id: string;
  role: string;
  roles: string[];
  companyId: string | null;
  supportCompanyId: string | null;
};

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  private isPlatform(actor: AnnouncementActor) {
    return isPlatformOwner(actor.role, actor.roles);
  }

  private isEditor(actor: AnnouncementActor) {
    return this.isPlatform(actor) || hasAnyRole(actor, ...Array.from(OFFICER_ROLES));
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
    if (this.isPlatform(actor)) return announcement;
    const cuerpoId = await this.resolveCuerpoId(actor);
    if (announcement.cuerpoId && cuerpoId && announcement.cuerpoId !== cuerpoId) {
      throw new ForbiddenException('Sin permiso para este comunicado');
    }
    return announcement;
  }

  private actorRoles(actor: AnnouncementActor) {
    return [actor.role, ...(actor.roles ?? [])].filter(Boolean) as string[];
  }

  private matchesTarget(
    user: { id?: string; role?: string | null; roles?: string[] | null; companyId?: string | null; supportCompanyId?: string | null },
    announcement: {
      targetCompanyIds?: string[];
      targetRoles?: string[];
      targetAudience?: string;
    },
  ) {
    const companyIds = announcement.targetCompanyIds ?? [];
    if (companyIds.length) {
      const inCompany = (user.companyId && companyIds.includes(user.companyId))
        || (user.supportCompanyId && companyIds.includes(user.supportCompanyId));
      if (!inCompany) return false;
    }
    const roles = announcement.targetRoles ?? [];
    if (roles.length) {
      const assigned = [user.role, ...(user.roles ?? [])].filter(Boolean) as string[];
      if (!roles.some((role) => assigned.includes(role))) return false;
    }
    if (announcement.targetAudience === 'OFFICERS') {
      const assigned = [user.role, ...(user.roles ?? [])].filter(Boolean) as string[];
      if (!assigned.some((role) => OFFICER_ROLES.has(role))) return false;
    }
    return true;
  }

  private async cuerpoUsers(cuerpoId: string): Promise<AudienceUser[]> {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { company: { cuerpoId } },
          { supportCompany: { cuerpoId } },
        ],
      },
      select: { id: true, role: true, roles: true, companyId: true, supportCompanyId: true },
    });
  }

  private cleanPoll(dto: { pollQuestion?: string; pollOptions?: string[]; pollClosesAt?: string }) {
    const question = dto.pollQuestion?.trim() || null;
    const options = (dto.pollOptions ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 6);
    if (question && options.length < 2) {
      throw new BadRequestException('La votación necesita al menos 2 alternativas');
    }
    return {
      pollQuestion: question && options.length >= 2 ? question : null,
      pollOptions: question && options.length >= 2 ? options : [],
      pollClosesAt: dto.pollClosesAt ? new Date(dto.pollClosesAt) : null,
    };
  }

  private decorate(
    row: {
      id: string;
      publishedBy: string;
      targetCompanyIds: string[];
      targetRoles: string[];
      targetAudience: string;
      requireAck: boolean;
      pollQuestion: string | null;
      pollOptions: string[];
      pollClosesAt: Date | null;
      [key: string]: unknown;
    },
    ctx: {
      editor: boolean;
      actorId: string;
      users: AudienceUser[];
      receipts: { announcementId: string; userId: string; readAt: Date; ackedAt: Date | null }[];
      votes: { announcementId: string; userId: string; optionIndex: number }[];
      publisher?: { firstName: string; lastName: string; role: string };
    },
  ) {
    const audience = ctx.users.filter((user) => user.id !== row.publishedBy && this.matchesTarget(user, row));
    const receipts = ctx.receipts.filter((item) => item.announcementId === row.id);
    const votes = ctx.votes.filter((item) => item.announcementId === row.id);
    const mineReceipt = receipts.find((item) => item.userId === ctx.actorId);
    const mineVote = votes.find((item) => item.userId === ctx.actorId);
    const closed = Boolean(row.pollClosesAt && row.pollClosesAt.getTime() <= Date.now());
    const showResults = ctx.editor || Boolean(mineVote) || closed;
    const results = row.pollOptions.map((_, index) => votes.filter((vote) => vote.optionIndex === index).length);

    return {
      ...row,
      publisher: ctx.publisher ?? { firstName: row.publishedBy, lastName: '', role: '' },
      stats: {
        sent: audience.length,
        read: receipts.filter((item) => item.readAt).length,
        acked: receipts.filter((item) => item.ackedAt).length,
      },
      mine: {
        read: Boolean(mineReceipt?.readAt),
        acked: Boolean(mineReceipt?.ackedAt),
        voteIndex: mineVote?.optionIndex ?? null,
      },
      poll: row.pollQuestion && row.pollOptions.length
        ? {
            question: row.pollQuestion,
            options: row.pollOptions,
            closesAt: row.pollClosesAt,
            closed,
            results: showResults ? results : row.pollOptions.map(() => 0),
            totalVotes: votes.length,
          }
        : null,
    };
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

    const cuerpoId = await this.resolveCuerpoId(actor);
    if (!this.isPlatform(actor)) {
      if (!cuerpoId) return [];
      where.cuerpoId = cuerpoId;
    }

    const announcements = await this.prisma.announcement.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
    });

    const editor = this.isEditor(actor);
    const visible = editor
      ? announcements
      : announcements.filter((item) => this.matchesTarget({
        id: actor.id,
        role: actor.role,
        roles: actor.roles,
        companyId: actor.companyId,
        supportCompanyId: null,
      }, item));

    const ids = visible.map((item) => item.id);
    const [users, receipts, votes, publishers] = await Promise.all([
      cuerpoId ? this.cuerpoUsers(cuerpoId) : Promise.resolve([] as AudienceUser[]),
      ids.length
        ? this.prisma.announcementReceipt.findMany({ where: { announcementId: { in: ids } } })
        : Promise.resolve([]),
      ids.length
        ? this.prisma.announcementVote.findMany({ where: { announcementId: { in: ids } } })
        : Promise.resolve([]),
      this.prisma.user.findMany({
        where: { id: { in: [...new Set(visible.map((item) => item.publishedBy))] } },
        select: { id: true, firstName: true, lastName: true, role: true },
      }),
    ]);
    const byPublisher = new Map(publishers.map((user) => [user.id, user]));

    return visible.map((row) => this.decorate(row, {
      editor,
      actorId: actor.id,
      users,
      receipts,
      votes,
      publisher: byPublisher.get(row.publishedBy),
    }));
  }

  async findOne(id: string, actor: AnnouncementActor) {
    const announcement = await this.assertAccess(id, actor);
    const editor = this.isEditor(actor);
    if (!editor && !this.matchesTarget({
      id: actor.id,
      role: actor.role,
      roles: actor.roles,
      companyId: actor.companyId,
    }, announcement)) {
      throw new ForbiddenException('Este aviso no es para tu perfil');
    }
    const cuerpoId = announcement.cuerpoId ?? await this.resolveCuerpoId(actor);
    const [users, receipts, votes, publisher] = await Promise.all([
      cuerpoId ? this.cuerpoUsers(cuerpoId) : Promise.resolve([] as AudienceUser[]),
      this.prisma.announcementReceipt.findMany({ where: { announcementId: id } }),
      this.prisma.announcementVote.findMany({ where: { announcementId: id } }),
      this.prisma.user.findUnique({
        where: { id: announcement.publishedBy },
        select: { id: true, firstName: true, lastName: true, role: true },
      }),
    ]);
    return this.decorate(announcement, {
      editor,
      actorId: actor.id,
      users,
      receipts,
      votes,
      publisher: publisher ?? undefined,
    });
  }

  async create(dto: CreateAnnouncementDto, actor: AnnouncementActor) {
    const cuerpoId = dto.companyId
      ? (await this.prisma.company.findUnique({
          where: { id: dto.companyId },
          select: { cuerpoId: true },
        }))?.cuerpoId ?? (await this.resolveCuerpoId(actor))
      : await this.resolveCuerpoId(actor);
    const poll = this.cleanPoll(dto);

    const created = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type ?? 'ANNOUNCEMENT',
        priority: dto.priority ?? 'MEDIUM',
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        eventLocation: dto.eventLocation || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
        targetAudience: dto.targetAudience ?? 'ALL',
        targetCompanyIds: dto.targetCompanyIds ?? [],
        targetRoles: dto.targetRoles ?? [],
        requireAck: dto.requireAck ?? false,
        ...poll,
        attachments: dto.attachments ?? [],
        imageUrl: dto.imageUrl || null,
        companyId: dto.companyId || actor.companyId || null,
        cuerpoId,
        publishedBy: actor.id,
      },
    });
    void this.push.notifyAnnouncement({
      announcementId: created.id,
      title: created.title,
      body: created.pollQuestion ? `${created.content}\n\nVotación: ${created.pollQuestion}` : created.content,
      priority: created.priority,
      cuerpoId,
      companyId: created.companyId,
      companyIds: created.targetCompanyIds,
      roles: created.targetRoles,
      senderUserId: actor.id,
    });
    return this.findOne(created.id, actor);
  }

  async update(id: string, dto: UpdateAnnouncementDto, actor: AnnouncementActor) {
    await this.assertAccess(id, actor);
    if (!this.isEditor(actor)) throw new ForbiddenException('Sin permiso para editar');
    const poll = dto.pollQuestion !== undefined || dto.pollOptions !== undefined
      ? this.cleanPoll(dto)
      : {};

    await this.prisma.announcement.update({
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
        targetCompanyIds: dto.targetCompanyIds,
        targetRoles: dto.targetRoles,
        requireAck: dto.requireAck,
        ...poll,
        pollClosesAt: dto.pollClosesAt === '' ? null : dto.pollClosesAt ? new Date(dto.pollClosesAt) : undefined,
        attachments: dto.attachments,
        imageUrl: dto.imageUrl === '' ? null : dto.imageUrl,
        companyId: dto.companyId,
      },
    });
    return this.findOne(id, actor);
  }

  async remove(id: string, actor: AnnouncementActor) {
    await this.assertAccess(id, actor);
    if (!this.isEditor(actor)) throw new ForbiddenException('Sin permiso para retirar');
    return this.prisma.announcement.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async markRead(id: string, actor: AnnouncementActor) {
    await this.assertAccess(id, actor);
    return this.prisma.announcementReceipt.upsert({
      where: { announcementId_userId: { announcementId: id, userId: actor.id } },
      create: { announcementId: id, userId: actor.id },
      update: {},
    });
  }

  async markAck(id: string, actor: AnnouncementActor) {
    const announcement = await this.assertAccess(id, actor);
    if (!announcement.requireAck) throw new BadRequestException('Este aviso no pide confirmación');
    return this.prisma.announcementReceipt.upsert({
      where: { announcementId_userId: { announcementId: id, userId: actor.id } },
      create: { announcementId: id, userId: actor.id, ackedAt: new Date() },
      update: { ackedAt: new Date() },
    });
  }

  async vote(id: string, optionIndex: number, actor: AnnouncementActor) {
    const announcement = await this.assertAccess(id, actor);
    if (!announcement.pollQuestion || announcement.pollOptions.length < 2) {
      throw new BadRequestException('Este aviso no tiene votación');
    }
    if (announcement.pollClosesAt && announcement.pollClosesAt.getTime() <= Date.now()) {
      throw new BadRequestException('La votación ya cerró');
    }
    if (optionIndex < 0 || optionIndex >= announcement.pollOptions.length) {
      throw new BadRequestException('Alternativa inválida');
    }
    await this.prisma.announcementReceipt.upsert({
      where: { announcementId_userId: { announcementId: id, userId: actor.id } },
      create: { announcementId: id, userId: actor.id },
      update: {},
    });
    await this.prisma.announcementVote.upsert({
      where: { announcementId_userId: { announcementId: id, userId: actor.id } },
      create: { announcementId: id, userId: actor.id, optionIndex },
      update: { optionIndex },
    });
    return this.findOne(id, actor);
  }
}
