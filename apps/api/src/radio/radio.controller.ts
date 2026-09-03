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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { memoryUpload } from '../storage/upload.interceptor';
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
  @UseInterceptors(memoryUpload({ maxBytes: 3 * 1024 * 1024, kind: 'audio' }))
  async upload(@UploadedFile() file: any, @Req() req: any) {
    if (!file?.buffer) throw new BadRequestException('Audio requerido');
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const named = {
      ...file,
      originalname: file.originalname || `radio-${Date.now()}.webm`,
    };
    const audioUrl = await this.storage.uploadFile(named, hostUrl, 'nodo360/radio');
    return { audioUrl };
  }
}
