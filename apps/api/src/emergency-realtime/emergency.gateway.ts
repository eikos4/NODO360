import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { isAllowedCorsOrigin } from '../common/cors-origins';
import { hasAnyRole } from '../common/user-roles';
import {
  EMERGENCY_SOCKET_NAMESPACE,
  EmergencyEventEnvelope,
} from './emergency-events.contract';

const roomForCompany = (companyId: string) => `emergency:company:${companyId}`;

@WebSocketGateway({
  namespace: EMERGENCY_SOCKET_NAMESPACE,
  cors: {
    origin: (origin, callback) => {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
  },
})
export class EmergencyGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EmergencyGateway.name);

  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      const publicSlug = String(
        client.handshake.auth?.slug ?? client.handshake.query?.slug ?? '',
      ).trim();

      if (!token && publicSlug) {
        await this.joinPublicSala(client, publicSlug);
        return;
      }
      if (!token) return client.disconnect(true);

      const payload = this.jwt.verify<{ sub?: string }>(token);
      if (!payload.sub) return client.disconnect(true);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          role: true,
          roles: true,
          isActive: true,
          companyId: true,
          supportCompanyId: true,
          company: { select: { isActive: true } },
          supportCompany: { select: { isActive: true } },
        },
      });
      if (!user?.isActive) return client.disconnect(true);

      let companyIds: string[];
      if (hasAnyRole(user, 'SUPER_ADMIN', 'KODESK')) {
        const companies = await this.prisma.company.findMany({
          where: { isActive: true },
          select: { id: true },
        });
        companyIds = companies.map((company) => company.id);
      } else {
        companyIds = [
          user.company?.isActive ? user.companyId : null,
          user.supportCompany?.isActive ? user.supportCompanyId : null,
        ].filter((id): id is string => Boolean(id));
      }
      if (companyIds.length === 0) return client.disconnect(true);

      client.data.userId = user.id;
      client.data.companyIds = companyIds;
      await client.join(companyIds.map(roomForCompany));
      client.emit('emergency.ready.v1', {
        schemaVersion: 1,
        companyIds,
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(`Emergency socket auth failed: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  private async joinPublicSala(client: Socket, slug: string) {
    const company = await this.prisma.company.findUnique({
      where: { dispatchSlug: slug },
      select: { id: true, isActive: true },
    });
    if (!company?.isActive) {
      client.disconnect(true);
      return;
    }
    client.data.publicSlug = slug;
    client.data.companyIds = [company.id];
    await client.join([roomForCompany(company.id)]);
    client.emit('emergency.ready.v1', {
      schemaVersion: 1,
      companyIds: [company.id],
      serverTime: new Date().toISOString(),
    });
  }

  emitToCompanies(event: EmergencyEventEnvelope) {
    const rooms = [...new Set(event.companyIds)].map(roomForCompany);
    if (rooms.length > 0) this.server?.to(rooms).emit(event.event, event);
  }
}
