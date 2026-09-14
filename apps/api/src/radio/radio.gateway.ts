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
import { RadioService, RadioTransmission } from './radio.service';
import { isAllowedCorsOrigin } from '../common/cors-origins';
import { hasAnyRole } from '../common/user-roles';
import { assertCompanyAccess } from '../common/cuerpo-scope';

type SocketUser = {
  userId: string;
  email: string;
  role: string;
  roles: string[];
  companyId: string | null;
  firstName: string;
  lastName: string;
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
    const speakerName = `${user.firstName} ${user.lastName}`.trim();
    const result = this.radio.tryPttStart(body.channelId, client.id, user.userId, speakerName);
    if (!result.ok) return result;
    const state = this.radio.snapshot(body.channelId);
    this.server.to(body.channelId).emit('channel:state', state);
    this.server.to(body.channelId).emit('ptt:active', {
      channelId: body.channelId,
      userId: user.userId,
      speakerName,
      role: user.role,
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
    const tx: RadioTransmission = {
      id: body.id || `tx_${Date.now()}`,
      channelId: body.channelId,
      userId: user.userId,
      speakerName: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      audioUrl: body.audioUrl,
      durationMs: body.durationMs ?? 0,
      at: Date.now(),
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
