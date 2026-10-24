import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RadioChannelKind = 'incident' | 'company';

export type RadioParticipant = {
  socketId: string;
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string | null;
  operativeNumber?: number | null;
};

export type RadioTransmission = {
  id: string;
  channelId: string;
  userId: string;
  speakerName: string;
  role: string;
  audioUrl: string;
  durationMs: number;
  at: number;
  operativeNumber?: number | null;
};

export type ChannelTalker = {
  userId: string;
  socketId: string;
  speakerName: string;
  since: number;
  operativeNumber?: number | null;
};

export function formatRadioSpeaker(
  firstName: string,
  lastName: string,
  operativeNumber?: number | null,
) {
  const name = `${firstName} ${lastName}`.trim() || 'Bombero';
  return operativeNumber != null ? `N° ${operativeNumber} · ${name}` : name;
}

@Injectable()
export class RadioService {
  private readonly logger = new Logger(RadioService.name);
  /** channelId → participants */
  private readonly rooms = new Map<string, Map<string, RadioParticipant>>();
  /** channelId → current talker */
  private readonly talkers = new Map<string, ChannelTalker>();
  /** channelId → recent clips */
  private readonly history = new Map<string, RadioTransmission[]>();
  /** incident channel → userIds autorizados por la centralista para PTT */
  private readonly allowedTalkers = new Map<string, string[]>();
  private readonly hydrated = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  static channelId(kind: RadioChannelKind, id: string) {
    return `${kind}:${id}`;
  }

  join(channelId: string, participant: RadioParticipant) {
    if (!this.rooms.has(channelId)) this.rooms.set(channelId, new Map());
    this.rooms.get(channelId)!.set(participant.socketId, participant);
    return this.snapshot(channelId);
  }

  leave(socketId: string) {
    const leftChannels: string[] = [];
    for (const [channelId, members] of this.rooms) {
      if (!members.has(socketId)) continue;
      members.delete(socketId);
      leftChannels.push(channelId);
      const talker = this.talkers.get(channelId);
      if (talker?.socketId === socketId) this.talkers.delete(channelId);
      if (members.size === 0) {
        this.rooms.delete(channelId);
        this.talkers.delete(channelId);
      }
    }
    return leftChannels;
  }

  isInChannel(channelId: string, socketId: string) {
    return this.rooms.get(channelId)?.has(socketId) === true;
  }

  leaveChannel(channelId: string, socketId: string) {
    const members = this.rooms.get(channelId);
    if (!members) return this.snapshot(channelId);
    members.delete(socketId);
    const talker = this.talkers.get(channelId);
    if (talker?.socketId === socketId) this.talkers.delete(channelId);
    if (members.size === 0) {
      this.rooms.delete(channelId);
      this.talkers.delete(channelId);
    }
    return this.snapshot(channelId);
  }

  tryPttStart(
    channelId: string,
    socketId: string,
    userId: string,
    speakerName: string,
    operativeNumber?: number | null,
  ): { ok: true } | { ok: false; reason: string; talker?: ChannelTalker } {
    const members = this.rooms.get(channelId);
    if (!members?.has(socketId)) {
      return { ok: false, reason: 'No estás en el canal' };
    }
    const current = this.talkers.get(channelId);
    if (current && current.socketId !== socketId) {
      return { ok: false, reason: 'Canal ocupado', talker: current };
    }
    this.talkers.set(channelId, { userId, socketId, speakerName, since: Date.now(), operativeNumber });
    return { ok: true };
  }

  pttStop(channelId: string, socketId: string) {
    const current = this.talkers.get(channelId);
    if (current?.socketId === socketId) this.talkers.delete(channelId);
    return this.snapshot(channelId);
  }

  addTransmission(tx: RadioTransmission) {
    const list = this.history.get(tx.channelId) ?? [];
    list.unshift(tx);
    this.history.set(tx.channelId, list.filter((item, idx) => idx === 0 || item.id !== tx.id).slice(0, 40));
    this.logger.log(`TX ${tx.channelId} ← ${tx.speakerName} (${tx.durationMs}ms)`);
    void this.prisma.radioClip.upsert({
      where: { id: tx.id },
      create: {
        id: tx.id,
        channelId: tx.channelId,
        userId: tx.userId,
        speakerName: tx.speakerName,
        role: tx.role,
        audioUrl: tx.audioUrl,
        durationMs: tx.durationMs,
        createdAt: new Date(tx.at || Date.now()),
      },
      update: {},
    }).catch((err) => {
      this.logger.warn(`No se pudo persistir clip de radio: ${(err as Error).message}`);
    });
  }

  setAllowedTalkers(channelId: string, userIds: string[]) {
    const unique = [...new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 2);
    this.allowedTalkers.set(channelId, unique);
    return unique;
  }

  async loadAllowedTalkers(channelId: string) {
    if (!channelId.startsWith('incident:')) {
      this.allowedTalkers.set(channelId, []);
      return [];
    }
    const incidentId = channelId.slice('incident:'.length);
    try {
      const rows = await this.prisma.$queryRaw<Array<{ radioTalkerIds: string[] | null }>>`
        SELECT "radioTalkerIds" FROM "Incident" WHERE id = ${incidentId} LIMIT 1
      `;
      const ids = this.setAllowedTalkers(channelId, rows[0]?.radioTalkerIds ?? []);
      return ids;
    } catch {
      this.allowedTalkers.set(channelId, []);
      return [];
    }
  }

  async allowedTalkerIds(channelId: string) {
    if (this.allowedTalkers.has(channelId)) return this.allowedTalkers.get(channelId) ?? [];
    return this.loadAllowedTalkers(channelId);
  }

  async incidentTalkers(incidentId: string) {
    const channelId = RadioService.channelId('incident', incidentId);
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: {
        id: true,
        companyId: true,
        emergencyResponses: {
          select: {
            status: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                operativeNumber: true,
                phone: true,
                company: { select: { number: true } },
              },
            },
          },
        },
        alarmNotifications: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            deliveries: {
              select: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    operativeNumber: true,
                    phone: true,
                    company: { select: { number: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!incident) return null;

    const allowedIds = await this.allowedTalkerIds(channelId);
    const byUser = new Map<string, {
      userId: string;
      firstName: string;
      lastName: string;
      operativeNumber: number | null;
      phone: string | null;
      companyNumber: number | null;
      response: string | null;
    }>();

    const touch = (
      user: {
        id: string;
        firstName: string;
        lastName: string;
        operativeNumber: number | null;
        phone: string | null;
        company: { number: number } | null;
      },
      response?: string | null,
    ) => {
      const current = byUser.get(user.id);
      if (current) {
        if (response && !current.response) current.response = response;
        return current;
      }
      const created = {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        operativeNumber: user.operativeNumber ?? null,
        phone: user.phone ?? null,
        companyNumber: user.company?.number ?? null,
        response: response ?? null,
      };
      byUser.set(user.id, created);
      return created;
    };

    for (const delivery of incident.alarmNotifications[0]?.deliveries ?? []) {
      if (delivery.user) touch(delivery.user);
    }
    for (const row of incident.emergencyResponses) {
      if (row.user) touch(row.user, row.status);
    }

    if (allowedIds.length) {
      const missing = allowedIds.filter((id) => !byUser.has(id));
      if (missing.length) {
        const extra = await this.prisma.user.findMany({
          where: { id: { in: missing } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            operativeNumber: true,
            phone: true,
            company: { select: { number: true } },
          },
        });
        for (const user of extra) touch(user);
      }
    }

    const rank = (status: string | null) => {
      if (status === 'ON_SCENE' || status === 'LOCATION_MARKED') return 0;
      if (status === 'GOING') return 1;
      if (status) return 2;
      return 3;
    };

    const candidates = [...byUser.values()].sort((a, b) => {
      const allowedDelta = Number(allowedIds.includes(b.userId)) - Number(allowedIds.includes(a.userId));
      if (allowedDelta) return allowedDelta;
      const statusDelta = rank(a.response) - rank(b.response);
      if (statusDelta) return statusDelta;
      return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'es');
    });

    return {
      incidentId,
      maxTalkers: 2,
      allowedUserIds: allowedIds,
      allowed: candidates.filter((row) => allowedIds.includes(row.userId)),
      candidates,
    };
  }

  async saveIncidentTalkers(incidentId: string, userIds: string[]) {
    const unique = [...new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 2);
    if (unique.length) {
      const found = await this.prisma.user.count({ where: { id: { in: unique } } });
      if (found !== unique.length) {
        throw new Error('Uno de los teléfonos no existe');
      }
    }
    await this.prisma.$executeRawUnsafe(
      `UPDATE "Incident" SET "radioTalkerIds" = $1::text[] WHERE id = $2`,
      unique,
      incidentId,
    );
    const channelId = RadioService.channelId('incident', incidentId);
    this.setAllowedTalkers(channelId, unique);
    return this.incidentTalkers(incidentId);
  }

  async hydrate(channelId: string) {
    await this.loadAllowedTalkers(channelId);
    if (this.hydrated.has(channelId)) return;
    this.hydrated.add(channelId);
    try {
      const rows = await this.prisma.radioClip.findMany({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        take: 40,
      });
      const speakers = await this.prisma.user.findMany({
        where: { id: { in: [...new Set(rows.map((row) => row.userId))] } },
        select: { id: true, firstName: true, lastName: true, operativeNumber: true },
      });
      const byUser = new Map(speakers.map((user) => [user.id, user]));
      const existing = this.history.get(channelId) ?? [];
      const byId = new Map(existing.map((item) => [item.id, item]));
      for (const row of rows) {
        if (byId.has(row.id)) continue;
        const speaker = byUser.get(row.userId);
        byId.set(row.id, {
          id: row.id,
          channelId: row.channelId,
          userId: row.userId,
          speakerName: speaker
            ? formatRadioSpeaker(speaker.firstName, speaker.lastName, speaker.operativeNumber)
            : row.speakerName,
          role: row.role,
          audioUrl: row.audioUrl,
          durationMs: row.durationMs,
          at: row.createdAt.getTime(),
          operativeNumber: speaker?.operativeNumber ?? null,
        });
      }
      this.history.set(
        channelId,
        [...byId.values()].sort((a, b) => b.at - a.at).slice(0, 40),
      );
    } catch (err) {
      this.hydrated.delete(channelId);
      this.logger.warn(`Radio hydrate falló: ${(err as Error).message}`);
    }
  }

  recent(channelId: string) {
    return this.history.get(channelId) ?? [];
  }

  snapshot(channelId: string) {
    const members = [...(this.rooms.get(channelId)?.values() ?? [])];
    return {
      channelId,
      listeners: members.length,
      participants: members.map((m) => ({
        userId: m.userId,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role,
        operativeNumber: m.operativeNumber ?? null,
      })),
      talker: this.talkers.get(channelId) ?? null,
      allowedTalkerIds: this.allowedTalkers.get(channelId) ?? [],
      recent: this.recent(channelId).slice(0, 12),
    };
  }
}
