import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PlatformLogLevel = 'INFO' | 'WARN' | 'ERROR';

@Injectable()
export class PlatformLogService {
  private readonly logger = new Logger(PlatformLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async write(entry: {
    level: PlatformLogLevel;
    source: string;
    message: string;
    detail?: Prisma.InputJsonValue;
    cuerpoId?: string | null;
  }) {
    try {
      await this.prisma.platformLog.create({
        data: {
          level: entry.level,
          source: entry.source,
          message: entry.message.slice(0, 1000),
          detail: entry.detail,
          cuerpoId: entry.cuerpoId ?? undefined,
        },
      });
    } catch (err) {
      this.logger.warn(`No se pudo persistir PlatformLog: ${err}`);
    }
  }

  list(limit = 100, level?: string) {
    return this.prisma.platformLog.findMany({
      where: level ? { level } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
      include: { cuerpo: { select: { id: true, name: true, city: true } } },
    });
  }
}
