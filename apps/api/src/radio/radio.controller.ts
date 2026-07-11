import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { RadioService } from './radio.service';

@Controller('radio')
@UseGuards(JwtAuthGuard)
export class RadioController {
  constructor(
    private readonly storage: StorageService,
    private readonly radio: RadioService,
  ) {}

  @Get('channels/:channelId/recent')
  recent(@Param('channelId') channelId: string) {
    return {
      channelId,
      recent: this.radio.recent(channelId),
      state: this.radio.snapshot(channelId),
    };
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok =
          /^audio\//i.test(file.mimetype) ||
          /\.(webm|ogg|mp3|m4a|wav)$/i.test(extname(file.originalname));
        cb(ok ? null : new BadRequestException('Solo audio'), ok);
      },
    }),
  )
  async upload(@UploadedFile() file: any, @Req() req: any) {
    if (!file?.buffer) throw new BadRequestException('Audio requerido');
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const named = {
      ...file,
      originalname: file.originalname || `radio-${Date.now()}.webm`,
    };
    const audioUrl = await this.storage.uploadFile(named, hostUrl);
    return { audioUrl };
  }
}
