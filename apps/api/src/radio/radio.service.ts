import { Injectable, Logger } from '@nestjs/common';

export type RadioChannelKind = 'incident' | 'company';

export type RadioParticipant = {
  socketId: string;
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string | null;
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
};

export type ChannelTalker = {
  userId: string;
  socketId: string;
  speakerName: string;
  since: number;
};

@Injectable()
export class RadioService {
  private readonly logger = new Logger(RadioService.name);
  /** channelId → participants */
  private readonly rooms = new Map<string, Map<string, RadioParticipant>>();
  /** channelId → current talker */
  private readonly talkers = new Map<string, ChannelTalker>();
  /** channelId → recent clips */
  private readonly history = new Map<string, RadioTransmission[]>();

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
  ): { ok: true } | { ok: false; reason: string; talker?: ChannelTalker } {
    const members = this.rooms.get(channelId);
    if (!members?.has(socketId)) {
      return { ok: false, reason: 'No estás en el canal' };
    }
    const current = this.talkers.get(channelId);
    if (current && current.socketId !== socketId) {
      return { ok: false, reason: 'Canal ocupado', talker: current };
    }
    this.talkers.set(channelId, { userId, socketId, speakerName, since: Date.now() });
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
    this.history.set(tx.channelId, list.slice(0, 40));
    this.logger.log(`TX ${tx.channelId} ← ${tx.speakerName} (${tx.durationMs}ms)`);
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
      })),
      talker: this.talkers.get(channelId) ?? null,
      recent: this.recent(channelId).slice(0, 12),
    };
  }
}
