import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RadioService, RadioTransmission } from './radio.service';

type SocketUser = {
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
  firstName: string;
  lastName: string;
};

@WebSocketGateway({
  namespace: '/radio',
  cors: {
    origin: (origin, cb) => {
      const allowed = [
        'http://localhost:5173',
        'http://localhost:5174',
        ...(process.env.FRONTEND_URL
          ? process.env.FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/$/, ''))
          : []),
      ];
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  },
})
export class RadioGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RadioGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly radio: RadioService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '');
      if (!token) {
        client.disconnect(true);
        return;
      }
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
          companyId: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });
      if (!user?.isActive) {
        client.disconnect(true);
        return;
      }
      const sockUser: SocketUser = {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        firstName: user.firstName,
        lastName: user.lastName,
      };
      client.data.user = sockUser;
      this.logger.log(`Radio conectado: ${user.firstName} ${user.lastName}`);
    } catch (err) {
      this.logger.warn(`Radio auth falló: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const channels = this.radio.leave(client.id);
    for (const channelId of channels) {
      this.server.to(channelId).emit('channel:state', this.radio.snapshot(channelId));
    }
  }

  private userOf(client: Socket): SocketUser | null {
    return (client.data.user as SocketUser | undefined) ?? null;
  }

  private canAccessChannel(user: SocketUser, channelId: string): boolean {
    if (user.role === 'SUPER_ADMIN' || user.role === 'COMANDANTE' || user.role === 'OPERADOR_CENTRAL') {
      return true;
    }
    if (channelId.startsWith('company:')) {
      const companyId = channelId.slice('company:'.length);
      return user.companyId === companyId || user.role === 'CAPITAN';
    }
    // incident:* — cualquier usuario autenticado activo (filtrado en join por respuesta)
    if (channelId.startsWith('incident:')) return true;
    return false;
  }

  @SubscribeMessage('channel:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId?: string },
  ) {
    const user = this.userOf(client);
    if (!user || !body?.channelId) return { ok: false, reason: 'Datos inválidos' };
    if (!this.canAccessChannel(user, body.channelId)) {
      return { ok: false, reason: 'Sin permiso para este canal' };
    }

    // Salir de otros canales incident/company del mismo cliente (un canal a la vez)
    const prev = this.radio.leave(client.id);
    for (const ch of prev) {
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
  onPttStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channelId?: string },
  ) {
    const user = this.userOf(client);
    if (!user || !body?.channelId) return { ok: false, reason: 'Datos inválidos' };
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
  onBroadcast(
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
    return { ok: true, tx };
  }
}
