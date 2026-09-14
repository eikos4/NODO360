import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { memoryUpload } from '../storage/upload.interceptor';
import { RadioService } from './radio.service';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, assertCompanyAccess } from '../common/cuerpo-scope';

@Controller('radio')
@UseGuards(JwtAuthGuard)
export class RadioController {
  constructor(
    private readonly storage: StorageService,
    private readonly radio: RadioService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('channels/:channelId/recent')
  async recent(@Param('channelId') channelId: string, @Req() req: { user: Actor }) {
    const id = decodeURIComponent(channelId);
    await this.assertChannelAccess(req.user, id);
    return {
      channelId: id,
      recent: this.radio.recent(id),
      state: this.radio.snapshot(id),
    };
  }

  @Post('upload')
  @UseInterceptors(memoryUpload({ maxBytes: 3 * 1024 * 1024, kind: 'audio' }))
  async upload(@UploadedFile() file: any, @Req() req: any) {
    if (!file?.buffer) throw new BadRequestException('Audio requerido');
    const named = {
      ...file,
      originalname: file.originalname || `radio-${Date.now()}.webm`,
    };
    const audioUrl = await this.storage.uploadFile(named, publicOrigin(req), 'nodo360/radio');
    return { audioUrl };
  }

  private async assertChannelAccess(actor: Actor, channelId: string) {
    if (channelId.startsWith('company:')) {
      await assertCompanyAccess(this.prisma, actor, channelId.slice('company:'.length));
      return;
    }
    if (channelId.startsWith('incident:')) {
      const incident = await this.prisma.incident.findUnique({
        where: { id: channelId.slice('incident:'.length) },
        select: {
          companyId: true,
          vehicles: { select: { vehicle: { select: { companyId: true } } } },
        },
      });
      if (!incident) throw new ForbiddenException('Canal no disponible');
      try {
        await assertCompanyAccess(this.prisma, actor, incident.companyId);
        return;
      } catch {
        if (actor.companyId && incident.vehicles.some((row) => row.vehicle.companyId === actor.companyId)) {
          return;
        }
        throw new ForbiddenException('Sin permiso para este canal');
      }
    }
    throw new ForbiddenException('Canal no disponible');
  }
}

function publicOrigin(req: { protocol?: string; get: (name: string) => string | undefined; headers?: Record<string, unknown> }) {
  const fromEnv = String(process.env.PUBLIC_API_ORIGIN || process.env.API_PUBLIC_ORIGIN || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const forwarded = String(req.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwarded || req.protocol || 'https';
  const host = req.get('host') || '';
  return `${proto}://${host}`;
}
