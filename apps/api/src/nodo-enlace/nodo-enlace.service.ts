import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, cuerpoIdForUser, isPlatformOwner } from '../common/cuerpo-scope';
import { RequestLinkDto } from './dto/request-link.dto';
import { SendMessageDto } from './dto/send-message.dto';

type CuerpoLinkStatus = 'PENDING' | 'ACTIVE' | 'CLOSED';

type EnlaceDb = PrismaService & {
  cuerpoLink: {
    findMany: (args: unknown) => Promise<any[]>;
    findUnique: (args: unknown) => Promise<any>;
    create: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
  cuerpoLinkMessage: {
    findMany: (args: unknown) => Promise<any[]>;
    create: (args: unknown) => Promise<any>;
  };
};

const LINK_ROLES = ['KODESK', 'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL'] as const;

const CUERPO_SELECT = { id: true, name: true, city: true, region: true, slug: true } as const;

const INCIDENT_SUMMARY = {
  id: true,
  code: true,
  type: true,
  address: true,
  dispatchedAt: true,
  company: { select: { number: true, name: true } },
} satisfies Prisma.IncidentSelect;

function pairIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function otherCuerpoId(link: { aCuerpoId: string; bCuerpoId: string }, me: string) {
  return link.aCuerpoId === me ? link.bCuerpoId : link.aCuerpoId;
}

@Injectable()
export class NodoEnlaceService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as EnlaceDb;
  }

  private async resolveCuerpoId(user: Actor, requested?: string | null) {
    if (isPlatformOwner(user.role, user.roles) && requested) {
      const row = await this.prisma.cuerpo.findFirst({
        where: { id: requested, isActive: true },
        select: { id: true },
      });
      if (!row) throw new NotFoundException('Cuerpo no encontrado');
      return row.id;
    }
    const cuerpoId = await cuerpoIdForUser(this.prisma, user);
    if (!cuerpoId) throw new ForbiddenException('Usuario sin Cuerpo asignado');
    if (requested && requested !== cuerpoId && !isPlatformOwner(user.role, user.roles)) {
      throw new ForbiddenException('No puede actuar por otro Cuerpo');
    }
    return cuerpoId;
  }

  async getNetwork(user: Actor, asCuerpoId?: string) {
    const meId = isPlatformOwner(user.role, user.roles)
      ? (asCuerpoId
          ? await this.resolveCuerpoId(user, asCuerpoId)
          : await cuerpoIdForUser(this.prisma, user))
      : await this.resolveCuerpoId(user);

    const [cuerpos, links, openIncidents] = await Promise.all([
      this.prisma.cuerpo.findMany({
        where: { isActive: true },
        select: { ...CUERPO_SELECT, _count: { select: { companies: true } } },
        orderBy: [{ region: 'asc' }, { city: 'asc' }, { name: 'asc' }],
      }),
      this.db.cuerpoLink.findMany({
        where: { status: { in: ['PENDING', 'ACTIVE'] } },
        include: {
          requestedBy: { select: { firstName: true, lastName: true } },
          incident: { select: { id: true, code: true, type: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { body: true, createdAt: true },
          },
        },
      }),
      this.prisma.incident.findMany({
        where: { closedAt: null, status: { in: ['ACTIVE', 'ARRIVED'] } },
        select: {
          ...INCIDENT_SUMMARY,
          company: { select: { number: true, name: true, cuerpoId: true } },
        },
        orderBy: { dispatchedAt: 'desc' },
        take: 200,
      }),
    ]);

    const incidentsByCuerpo = new Map<string, typeof openIncidents>();
    for (const inc of openIncidents) {
      const cuerpoId = inc.company.cuerpoId;
      const list = incidentsByCuerpo.get(cuerpoId) ?? [];
      list.push(inc);
      incidentsByCuerpo.set(cuerpoId, list);
    }

    const linkByPair = new Map<string, (typeof links)[number]>();
    for (const link of links) {
      linkByPair.set(`${link.aCuerpoId}:${link.bCuerpoId}`, link);
    }

    const mapIncident = (inc: (typeof openIncidents)[number]) => ({
      id: inc.id,
      code: inc.code,
      type: inc.type,
      address: inc.address,
      dispatchedAt: inc.dispatchedAt,
      companyNumber: inc.company.number,
      companyName: inc.company.name,
    });

    const mapCuerpo = (cuerpo: (typeof cuerpos)[number], includeList: boolean) => {
      const emergencies = incidentsByCuerpo.get(cuerpo.id) ?? [];
      return {
        id: cuerpo.id,
        name: cuerpo.name,
        city: cuerpo.city,
        region: cuerpo.region,
        slug: cuerpo.slug,
        companyCount: cuerpo._count.companies,
        activeCount: emergencies.length,
        latestType: emergencies[0]?.type ?? null,
        activeEmergencies: includeList ? emergencies.slice(0, 8).map(mapIncident) : [],
      };
    };

    const me = meId ? cuerpos.find((c) => c.id === meId) : null;

    return {
      me: me ? mapCuerpo(me, true) : null,
      pendingIn: meId
        ? links
            .filter((l) => l.status === 'PENDING' && l.requestedByCuerpoId !== meId && (l.aCuerpoId === meId || l.bCuerpoId === meId))
            .map((l) => this.mapLink(l, meId))
        : [],
      pendingOut: meId
        ? links
            .filter((l) => l.status === 'PENDING' && l.requestedByCuerpoId === meId)
            .map((l) => this.mapLink(l, meId))
        : [],
      cuerpos: cuerpos
        .filter((c) => c.id !== meId)
        .map((cuerpo) => {
          const [a, b] = meId ? pairIds(meId, cuerpo.id) : [cuerpo.id, cuerpo.id];
          const link = meId ? linkByPair.get(`${a}:${b}`) : undefined;
          const connected = link?.status === 'ACTIVE';
          return {
            ...mapCuerpo(cuerpo, connected),
            link: link && meId ? this.mapLink(link, meId) : null,
          };
        }),
    };
  }

  async requestLink(user: Actor, dto: RequestLinkDto) {
    if (!user.id) throw new ForbiddenException('Usuario requerido');
    const fromId = await this.resolveCuerpoId(user, dto.fromCuerpoId);
    const toId = dto.toCuerpoId?.trim();
    if (!toId || toId === fromId) throw new BadRequestException('Elegí otro Cuerpo para enlazar');

    const target = await this.prisma.cuerpo.findFirst({
      where: { id: toId, isActive: true },
      select: { id: true, name: true },
    });
    if (!target) throw new NotFoundException('Cuerpo no encontrado');

    let incident: { id: string; code: string; type: string } | null = null;
    if (dto.incidentId) {
      const row = await this.prisma.incident.findFirst({
        where: {
          id: dto.incidentId,
          closedAt: null,
          company: { cuerpoId: fromId },
        },
        select: { id: true, code: true, type: true },
      });
      if (!row) throw new BadRequestException('La emergencia no pertenece a tu Cuerpo o ya está cerrada');
      incident = row;
    }

    const [aCuerpoId, bCuerpoId] = pairIds(fromId, toId);
    const existing = await this.db.cuerpoLink.findUnique({
      where: { aCuerpoId_bCuerpoId: { aCuerpoId, bCuerpoId } },
    });

    if (existing?.status === 'ACTIVE') {
      throw new ConflictException('Ya hay un enlace activo con ese Cuerpo');
    }
    if (existing?.status === 'PENDING') {
      throw new ConflictException('Ya hay una solicitud de enlace en curso');
    }

    const note = dto.note?.trim() || (incident ? `Enlace por emergencia ${incident.code}` : null);
    const link = existing
      ? await this.db.cuerpoLink.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            requestedByCuerpoId: fromId,
            requestedById: user.id,
            incidentId: incident?.id ?? null,
            note,
            closedAt: null,
          },
          include: this.linkInclude(),
        })
      : await this.db.cuerpoLink.create({
          data: {
            aCuerpoId,
            bCuerpoId,
            requestedByCuerpoId: fromId,
            requestedById: user.id,
            incidentId: incident?.id ?? null,
            note,
          },
          include: this.linkInclude(),
        });

    return this.mapLink(link, fromId);
  }

  async acceptLink(user: Actor, id: string) {
    const meId = await this.resolveCuerpoId(user);
    const link = await this.getLinkOrThrow(id);
    if (link.status !== 'PENDING') throw new BadRequestException('El enlace ya no está pendiente');
    if (link.requestedByCuerpoId === meId) {
      throw new ForbiddenException('El otro Cuerpo debe aceptar el enlace');
    }
    if (link.aCuerpoId !== meId && link.bCuerpoId !== meId) {
      throw new ForbiddenException('Este enlace no es de tu Cuerpo');
    }

    const updated = await this.db.cuerpoLink.update({
      where: { id },
      data: { status: 'ACTIVE', closedAt: null },
      include: this.linkInclude(),
    });
    await this.db.cuerpoLinkMessage.create({
      data: {
        linkId: id,
        cuerpoId: meId,
        userId: user.id!,
        body: 'Enlace aceptado. Las centrales ya pueden coordinar por este canal.',
        incidentId: updated.incidentId,
      },
    });
    return this.mapLink(updated, meId);
  }

  async closeLink(user: Actor, id: string) {
    const meId = await this.resolveCuerpoId(user);
    const link = await this.getLinkOrThrow(id);
    if (link.aCuerpoId !== meId && link.bCuerpoId !== meId && !isPlatformOwner(user.role, user.roles)) {
      throw new ForbiddenException('Este enlace no es de tu Cuerpo');
    }
    if (link.status === 'CLOSED') return this.mapLink(link, meId);
    const updated = await this.db.cuerpoLink.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: this.linkInclude(),
    });
    return this.mapLink(updated, meId);
  }

  async getLink(user: Actor, id: string) {
    const meId = await this.resolveCuerpoId(user);
    const link = await this.getLinkOrThrow(id);
    this.assertMember(link, meId, user);
    const otherId = otherCuerpoId(link, meId);
    const [other, emergencies] = await Promise.all([
      this.prisma.cuerpo.findUnique({
        where: { id: otherId },
        select: { ...CUERPO_SELECT, _count: { select: { companies: true } } },
      }),
      link.status === 'ACTIVE'
        ? this.prisma.incident.findMany({
            where: {
              closedAt: null,
              status: { in: ['ACTIVE', 'ARRIVED'] },
              company: { cuerpoId: otherId },
            },
            select: INCIDENT_SUMMARY,
            orderBy: { dispatchedAt: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
    ]);
    return {
      ...this.mapLink(link, meId),
      other: other
        ? {
            id: other.id,
            name: other.name,
            city: other.city,
            region: other.region,
            slug: other.slug,
            companyCount: other._count.companies,
          }
        : null,
      activeEmergencies: emergencies.map((inc) => ({
        id: inc.id,
        code: inc.code,
        type: inc.type,
        address: inc.address,
        dispatchedAt: inc.dispatchedAt,
        companyNumber: inc.company.number,
        companyName: inc.company.name,
      })),
    };
  }

  async listMessages(user: Actor, id: string, after?: string) {
    const meId = await this.resolveCuerpoId(user);
    const link = await this.getLinkOrThrow(id);
    this.assertMember(link, meId, user);
    if (link.status === 'CLOSED') throw new ForbiddenException('El enlace está cerrado');

    const messages = await this.db.cuerpoLinkMessage.findMany({
      where: {
        linkId: id,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: after ? 80 : 120,
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
        cuerpo: { select: { id: true, name: true, city: true } },
        incident: { select: { id: true, code: true, type: true } },
      },
    });

    return messages.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      mine: row.cuerpoId === meId,
      author: `${row.user.firstName} ${row.user.lastName}`.trim(),
      role: row.user.role,
      cuerpoId: row.cuerpo.id,
      cuerpoName: row.cuerpo.name,
      incident: row.incident,
    }));
  }

  async sendMessage(user: Actor, id: string, dto: SendMessageDto) {
    if (!user.id) throw new ForbiddenException('Usuario requerido');
    const meId = await this.resolveCuerpoId(user);
    const link = await this.getLinkOrThrow(id);
    this.assertMember(link, meId, user);
    if (link.status !== 'ACTIVE') throw new ForbiddenException('El enlace aún no está activo');

    const body = dto.body.trim();
    if (!body) throw new BadRequestException('Escribí un mensaje');

    let incidentId: string | null = null;
    if (dto.incidentId) {
      const incident = await this.prisma.incident.findFirst({
        where: {
          id: dto.incidentId,
          closedAt: null,
          company: { cuerpoId: { in: [link.aCuerpoId, link.bCuerpoId] } },
        },
        select: { id: true },
      });
      incidentId = incident?.id ?? null;
    }

    const row = await this.db.cuerpoLinkMessage.create({
      data: { linkId: id, cuerpoId: meId, userId: user.id, body, incidentId },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
        cuerpo: { select: { id: true, name: true, city: true } },
        incident: { select: { id: true, code: true, type: true } },
      },
    });

    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      mine: true,
      author: `${row.user.firstName} ${row.user.lastName}`.trim(),
      role: row.user.role,
      cuerpoId: row.cuerpo.id,
      cuerpoName: row.cuerpo.name,
      incident: row.incident,
    };
  }

  private linkInclude() {
    return {
      aCuerpo: { select: CUERPO_SELECT },
      bCuerpo: { select: CUERPO_SELECT },
      requestedBy: { select: { firstName: true, lastName: true } },
      incident: { select: { id: true, code: true, type: true } },
      messages: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: { body: true, createdAt: true },
      },
    };
  }

  private async getLinkOrThrow(id: string) {
    const link = await this.db.cuerpoLink.findUnique({
      where: { id },
      include: this.linkInclude(),
    });
    if (!link) throw new NotFoundException('Enlace no encontrado');
    return link;
  }

  private assertMember(
    link: { aCuerpoId: string; bCuerpoId: string },
    meId: string,
    user: Actor,
  ) {
    if (link.aCuerpoId === meId || link.bCuerpoId === meId) return;
    if (isPlatformOwner(user.role, user.roles)) return;
    throw new ForbiddenException('Este enlace no es de tu Cuerpo');
  }

  private mapLink(
    link: {
      id: string;
      aCuerpoId: string;
      bCuerpoId: string;
      requestedByCuerpoId: string;
      status: CuerpoLinkStatus;
      note: string | null;
      createdAt: Date;
      incident: { id: string; code: string; type: string } | null;
      requestedBy: { firstName: string; lastName: string };
      aCuerpo?: { id: string; name: string; city: string; region: string; slug: string };
      bCuerpo?: { id: string; name: string; city: string; region: string; slug: string };
      messages?: { body: string; createdAt: Date }[];
    },
    meId: string,
  ) {
    const otherId = otherCuerpoId(link, meId);
    const other = link.aCuerpoId === otherId ? link.aCuerpo : link.bCuerpo;
    const last = link.messages?.[0];
    return {
      id: link.id,
      status: link.status,
      note: link.note,
      createdAt: link.createdAt,
      incoming: link.requestedByCuerpoId !== meId,
      requestedBy: `${link.requestedBy.firstName} ${link.requestedBy.lastName}`.trim(),
      incident: link.incident,
      lastMessage: last?.body ?? null,
      lastMessageAt: last?.createdAt ?? null,
      other: other ?? { id: otherId, name: 'Cuerpo', city: '', region: '', slug: '' },
    };
  }
}

export const NODO_ENLACE_ROLES = LINK_ROLES;
