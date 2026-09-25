import {
  BadRequestException,
  Body,
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
import { UploadRadioBase64Dto } from './dto/upload-radio-base64.dto';
import { DispatchCentralService } from '../dispatch-central/dispatch-central.service';
import { HeaderRequest } from '../common/sala-token';

@Controller('radio')
export class RadioController {
  constructor(
    private readonly storage: StorageService,
    private readonly radio: RadioService,
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchCentralService,
  ) {}

  @Get('channels/:channelId/recent')
  @UseGuards(JwtAuthGuard)
  async recent(@Param('channelId') channelId: string, @Req() req: { user: Actor }) {
    const id = decodeURIComponent(channelId);
    await this.assertChannelAccess(req.user, id);
    await this.radio.hydrate(id);
    return {
      channelId: id,
      recent: this.radio.recent(id),
      state: this.radio.snapshot(id),
    };
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
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

  /** Upload desde tablet NodoTrack (PIN de sala). */
  @Post('public/:slug/upload')
  @UseInterceptors(memoryUpload({ maxBytes: 3 * 1024 * 1024, kind: 'audio' }))
  async uploadPublic(
    @Param('slug') slug: string,
    @UploadedFile() file: any,
    @Req()
    req: HeaderRequest & {
      protocol?: string;
      get: (n: string) => string | undefined;
      headers?: Record<string, unknown>;
    },
  ) {
    await this.dispatch.assertPublicWriteAccess(slug, req);
    if (!file?.buffer) throw new BadRequestException('Audio requerido');
    const named = {
      ...file,
      originalname: file.originalname || `radio-sala-${Date.now()}.webm`,
    };
    const audioUrl = await this.storage.uploadFile(named, publicOrigin(req), 'nodo360/radio');
    return { audioUrl };
  }

  @Post('upload-base64')
  @UseGuards(JwtAuthGuard)
  async uploadBase64(@Body() body: UploadRadioBase64Dto, @Req() req: any) {
    const raw = String(body?.audio || '').replace(/^data:[^;]+;base64,/, '');
    if (!raw) throw new BadRequestException('Audio requerido');
    const buffer = Buffer.from(raw, 'base64');
    if (!buffer.length) throw new BadRequestException('Audio requerido');
    if (buffer.length > 3 * 1024 * 1024) throw new BadRequestException('Audio demasiado grande');
    const mime = /^audio\//i.test(body.mimeType || '') ? body.mimeType : 'audio/webm';
    const filename = `radio-${Date.now()}.${extFromMime(mime)}`;
    const audioUrl = await this.storage.uploadFile(
      { buffer, originalname: filename, mimetype: mime },
      publicOrigin(req),
      'nodo360/radio',
    );
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

function publicOrigin(req: {
  protocol?: string;
  get: (name: string) => string | undefined;
  headers?: Record<string, unknown>;
}) {
  const fromEnv = String(process.env.PUBLIC_API_ORIGIN || process.env.API_PUBLIC_ORIGIN || '').replace(
    /\/$/,
    '',
  );
  if (fromEnv) return fromEnv;
  const forwarded = String(req.headers?.['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const proto = forwarded || req.protocol || 'https';
  const host = req.get('host') || '';
  return `${proto}://${host}`;
}

function extFromMime(mime: string) {
  const m = (mime || '').toLowerCase();
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return 'm4a';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('3gp')) return '3gp';
  if (m.includes('ogg')) return 'ogg';
  return 'webm';
}
