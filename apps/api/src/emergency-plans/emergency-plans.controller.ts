import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { EmergencyPlansService } from './emergency-plans.service';
import { CreateEmergencyPlanDto } from './dto/create-emergency-plan.dto';
import { UpdateEmergencyPlanDto } from './dto/update-emergency-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const fileStorage = diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + extname(file.originalname));
  },
});

@Controller('emergency-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmergencyPlansController {
  constructor(private readonly emergencyPlansService: EmergencyPlansService) {}

  @Get()
  findAll(@Query() filters: { emergencyType?: string; severity?: string; companyId?: string; status?: string }) {
    return this.emergencyPlansService.findAll(filters);
  }

  @Post('upload')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO')
  @UseInterceptors(FileInterceptor('file', {
    storage: fileStorage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = /pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|gif|zip|txt|csv/i;
      allowed.test(extname(file.originalname))
        ? cb(null, true)
        : cb(new BadRequestException('Tipo de archivo no permitido'), false);
    },
  }))
  uploadFile(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const host = `${req.protocol}://${req.get('host')}`;
    return {
      fileUrl: `${host}/uploads/${file.filename}`,
      name: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  @Get('match')
  match(
    @Query('companyId') companyId: string,
    @Query('incidentType') incidentType: string,
  ) {
    return this.emergencyPlansService.matchForIncident(companyId, incidentType);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.emergencyPlansService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO')
  create(@Body() dto: CreateEmergencyPlanDto, @Req() req: any) {
    const changedBy = req.user?.email ?? req.user?.id;
    return this.emergencyPlansService.create(dto, changedBy);
  }

  @Post(':id/attachments')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO')
  @UseInterceptors(FileInterceptor('file', {
    storage: fileStorage,
    limits: { fileSize: 25 * 1024 * 1024 },
  }))
  async addAttachment(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('name') name: string,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const host = `${req.protocol}://${req.get('host')}`;
    return this.emergencyPlansService.addAttachment(id, {
      name: name || file.originalname,
      fileUrl: `${host}/uploads/${file.filename}`,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  @Delete(':id/attachments/:attachmentId')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO')
  removeAttachment(@Param('id') id: string, @Param('attachmentId') attachmentId: string) {
    return this.emergencyPlansService.removeAttachment(id, attachmentId);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO')
  update(@Param('id') id: string, @Body() dto: UpdateEmergencyPlanDto, @Req() req: any) {
    const changedBy = req.user?.email ?? req.user?.id;
    return this.emergencyPlansService.update(id, dto, changedBy);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO')
  remove(@Param('id') id: string) {
    return this.emergencyPlansService.remove(id);
  }
}
