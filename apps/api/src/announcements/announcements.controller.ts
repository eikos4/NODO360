import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StorageService } from '../storage/storage.service';
import { memoryUpload } from '../storage/upload.interceptor';

const EDITORS = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO'] as const;

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  findAll(
    @Req() req: { user: { id: string; role?: string; companyId?: string | null; cuerpoId?: string | null } },
    @Query() filters: { type?: string; priority?: string; targetAudience?: string },
  ) {
    return this.announcementsService.findAll(req.user, filters);
  }

  @Post('upload')
  @Roles(...EDITORS)
  @UseInterceptors(memoryUpload({ maxBytes: 5 * 1024 * 1024, kind: 'image' }))
  async upload(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = await this.storage.uploadFile(file, hostUrl, 'nodo360/announcements');
    return { imageUrl };
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: { user: { id: string; role?: string; companyId?: string | null; cuerpoId?: string | null } },
  ) {
    return this.announcementsService.findOne(id, req.user);
  }

  @Post()
  @Roles(...EDITORS)
  create(
    @Body() dto: CreateAnnouncementDto,
    @Req() req: { user: { id: string; role?: string; companyId?: string | null; cuerpoId?: string | null } },
  ) {
    return this.announcementsService.create(dto, req.user);
  }

  @Put(':id')
  @Roles(...EDITORS)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @Req() req: { user: { id: string; role?: string; companyId?: string | null; cuerpoId?: string | null } },
  ) {
    return this.announcementsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(...EDITORS)
  remove(
    @Param('id') id: string,
    @Req() req: { user: { id: string; role?: string; companyId?: string | null; cuerpoId?: string | null } },
  ) {
    return this.announcementsService.remove(id, req.user);
  }
}
