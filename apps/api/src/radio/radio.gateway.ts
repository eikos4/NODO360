import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { formatRadioSpeaker, RadioService, RadioTransmission } from './radio.service';
import { isAllowedCorsOrigin } from '../common/cors-origins';
import { hasAnyRole } from '../common/user-roles';
import { assertCompanyAccess } from '../common/cuerpo-scope';
import { readSalaToken } from '../common/sala-token';

type SocketUser = {
  userId: string;
  email: string;
  role: string;
  roles: string[];
  companyId: string | null;
  firstName: string;
  lastName: string;
  operativeNumber: number | null;
  /** Tablet NodoTrack / sala de máquinas (PIN) */
  isSala?: boolean;
  salaSlug?: string;
};

@WebSocketGateway({
  namespace: '/radio',
  cors: {
    origin: (origin, cb) => cb(null, isAllowedCorsOrigin(origin)),
    credentials: true,
  },
})
export class RadioGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RadioGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly radio: RadioService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        socket.data.user = await this.authenticate(socket);
        next();
      } catch (err) {
        this.logger.warn(`Radio auth falló: ${(err as Error).message}`);
        next(new Error('unauthorized'));
      }
    });
  }

  handleConnection(client: Socket) {
    const user = this.userOf(client);
    if (!user) {
      client.disconnect(true);
      return;
    }
    this.logger.log(`Radio conectado: ${user.firstName} ${user.lastName}`);
    client.emit('radio.ready', { serverTime: new Date().toISOString() });
  }

  handleDisconnect(client: Socket) {
    const channels = this.radio.leave(client.id);
    for (const channelId of channels) {
      this.server.to(channelId).emit('channel:state', this.radio.snapshot(channelId));
    }
  }

  private async authenticate(client: Socket): Promise<SocketUser> {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '');
    const salaToken = String(client.handshake.auth?.salaToken ?? '').trim() || token;
    const salaPayload = readSalaToken(this.jwt, salaToken);
    if (salaPayload) {
      const company = await this.prisma.company.findFirst({
        where: {
          id: salaPayload.companyId,
          dispatchSlug: salaPayload.slug,
          isActive: true,
          dispatchPublicEnabled: true,
        },
        select: { id: true, number: true, name: true, dispatchSlug: true },
      });
      if (!company) throw new Error('Sala no válida');
      return {
        userId: `sala:${company.id}`,
        email: `sala+${company.dispatchSlug}@nodo360.local`,
        role: 'OPERADOR_CENTRAL',
        roles: ['OPERADOR_CENTRAL'],
        companyId: company.id,
        firstName: 'Cabina',
        lastName: `${company.number}ª`,
        operativeNumber: null,
        isSala: true,
        salaSlug: company.dispatchSlug ?? undefined,
      };
    }
    if (!token) throw new Error('Sin token');
    const payload = this.jwt.verify(token) as {
      sub: string;
      email: string;
      role: string;
      companyId?: string | null;
    };
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        roles: true,
        companyId: true,
        firstName: true,
        lastName: true,
        operativeNumber: true,
        isActive: true,
      },
    });
    if (!user?.isActive) throw new Error('Usuario inactivo');
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      roles: user.roles ?? [],
      companyId: user.companyId,
      firstName: user.firstName,
      lastName: user.lastName,
      operativeNumber: user.operativeNumber ?? null,
    };
  }

  private userOf(client: Socket): SocketUser | null {
    return (client.data.user as SocketUser | undefined) ?? null;
  }

  private async canAccessChannel(user: SocketUser, channelId: string): Promise<boolean> {
    if (hasAnyRole(user, 'KODESK')) return true;
    if (channelId.startsWith('company:')) {
      const companyId = channelId.slice('company:'.length);
      try {
        await assertCompanyAccess(this.prisma, user, companyId);
        return true;
      } catch {
        return false;
      }
    }
    if (channelId.startsWith('incident:')) {
      const incidentId = channelId.slice('incident:'.length);
      const incident = await this.prisma.incident.findUnique({
        where: { id: incidentId },
        select: {
          companyId: true,
          vehicles: { select: { vehicle: { select: { companyId: true } } } },
        },
      });
      if (!incident) return false;
      try {
        await assertCompanyAccess(this.prisma, user, incident.companyId);
        return true;
      } catch {
        return Boolean(
          user.companyId &&
            incident.vehicles.some((row) => row.vehicle.companyId === user.companyId),
        );
      }
    }
    return false;
  }

  private async canTalkOnChannel(user: SocketUser, channelId: string): Promise<boolean> {
    if (user.isSala) return this.canAccessChannel(user, channelId);
    if (hasAnyRole(user, 'OPERADOR_CENTRAL', 'COMANDANTE', 'CAPITAN', 'SUPER_ADMIN', 'KODESK')) {
      return true;
    }
    if (!channelId.startsWith('incident:')) return false;
    const incidentId = channelId.slice('incident:'.length);
    const response = await this.prisma.incidentEmergencyResponse.findUnique({
      where: { incidentId_userId: { incidentId, userId: user.userId } },
      select: { status: true, locationMarkedAt: true },
    });
    return (
      response?.status === 'GOING' ||
      response?.status === 'ON_SCENE' ||
      Boolean(response?.locationMarkedAt)
    );
  }

  @SubscribeMessage('channel:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId?: string },
  ) {
    const user = this.userOf(client);
    if (!user || !body?.channelId) return { ok: false, reason: 'Datos inválidos' };
    if (!(await this.canAccessChannel(user, body.channelId))) {
      return { ok: false, reason: 'Sin permiso para este canal' };
    }

    await this.radio.hydrate(body.channelId);

    const prev = this.radio.leave(client.id);
    for (const ch of prev) {
      if (ch === body.channelId) continue;
      client.leave(ch);
      this.server.to(ch).emit('channel:state', this.radio.snapshot(ch));
    }

    this.radio.join(body.channelId, {
      socketId: client.id,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      operativeNumber: user.operativeNumber,
    });
    await client.join(body.channelId);
    const state = this.radio.snapshot(body.channelId);
    this.server.to(body.channelId).emit('channel:state', state);
    return { ok: true, state };
  }

  @SubscribeMessage('channel:leave')
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId?: string },
  ) {
    if (!body?.channelId) return { ok: false };
    this.radio.leaveChannel(body.channelId, client.id);
    await client.leave(body.channelId);
    this.server.to(body.channelId).emit('channel:state', this.radio.snapshot(body.channelId));
    return { ok: true };
  }

  @SubscribeMessage('ptt:start')
  async onPttStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId?: string },
  ) {
    const user = this.userOf(client);
    if (!user || !body?.channelId) return { ok: false, reason: 'Datos inválidos' };
    if (!this.radio.isInChannel(body.channelId, client.id)) {
      const joined = await this.onJoin(client, body);
      if (!joined?.ok) return joined;
    }
    if (!(await this.canTalkOnChannel(user, body.channelId))) {
      return { ok: false, reason: 'Marcá VOY para transmitir' };
    }
    const speakerName = formatRadioSpeaker(user.firstName, user.lastName, user.operativeNumber);
    const result = this.radio.tryPttStart(
      body.channelId,
      client.id,
      user.userId,
      speakerName,
      user.operativeNumber,
    );
    if (!result.ok) return result;
    const state = this.radio.snapshot(body.channelId);
    this.server.to(body.channelId).emit('channel:state', state);
    this.server.to(body.channelId).emit('ptt:active', {
      channelId: body.channelId,
      userId: user.userId,
      speakerName,
      role: user.role,
      operativeNumber: user.operativeNumber,
    });
    return { ok: true };
  }

  @SubscribeMessage('ptt:stop')
  onPttStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId?: string },
  ) {
    if (!body?.channelId) return { ok: false };
    const state = this.radio.pttStop(body.channelId, client.id);
    this.server.to(body.channelId).emit('channel:state', state);
    this.server.to(body.channelId).emit('ptt:idle', { channelId: body.channelId });
    return { ok: true };
  }

  /** Tras subir el audio por HTTP, el cliente emite esto para retransmitir. */
  @SubscribeMessage('tx:broadcast')
  async onBroadcast(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      channelId?: string;
      audioUrl?: string;
      durationMs?: number;
      id?: string;
    },
  ) {
    const user = this.userOf(client);
    if (!user || !body?.channelId || !body?.audioUrl) {
      return { ok: false, reason: 'Datos inválidos' };
    }
    if (!this.radio.isInChannel(body.channelId, client.id)) {
      const joined = await this.onJoin(client, body);
      if (!joined?.ok) return joined;
    }
    if (!(await this.canTalkOnChannel(user, body.channelId))) {
      return { ok: false, reason: 'Marcá VOY para transmitir' };
    }
    if (!isSafeRadioAudioUrl(body.audioUrl)) {
      return { ok: false, reason: 'Audio inválido' };
    }
    const tx: RadioTransmission = {
      id: body.id || `tx_${Date.now()}`,
      channelId: body.channelId,
      userId: user.userId,
      speakerName: formatRadioSpeaker(user.firstName, user.lastName, user.operativeNumber),
      role: user.role,
      audioUrl: body.audioUrl,
      durationMs: body.durationMs ?? 0,
      at: Date.now(),
      operativeNumber: user.operativeNumber,
    };
    this.radio.addTransmission(tx);
    this.radio.pttStop(body.channelId, client.id);
    const state = this.radio.snapshot(body.channelId);
    this.server.to(body.channelId).emit('tx:new', tx);
    this.server.to(body.channelId).emit('channel:state', state);
    this.server.to(body.channelId).emit('ptt:idle', { channelId: body.channelId });
    client.emit('tx:new', tx);
    return { ok: true, tx, state };
  }
}

function isSafeRadioAudioUrl(url: string) {
  try {
    const parsed = new URL(url, 'https://nodo360.invalid');
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const path = parsed.pathname.toLowerCase();
    if (/\.(html?|svg|js|mjs|xml)$/i.test(path)) return false;
    return (
      path.includes('/uploads/')
      || path.includes('/nodo360/radio')
      || parsed.hostname.includes('cloudinary.com')
      || parsed.hostname.includes('res.cloudinary.com')
    );
  } catch {
    return false;
  }
}
