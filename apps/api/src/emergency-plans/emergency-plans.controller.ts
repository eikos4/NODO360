import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException, Req,
} from '@nestjs/common';
import { EmergencyPlansService } from './emergency-plans.service';
import { CreateEmergencyPlanDto } from './dto/create-emergency-plan.dto';
import { UpdateEmergencyPlanDto } from './dto/update-emergency-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StorageService } from '../storage/storage.service';
import { memoryUpload } from '../storage/upload.interceptor';

@Controller('emergency-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmergencyPlansController {
  constructor(
    private readonly emergencyPlansService: EmergencyPlansService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  findAll(@Query() filters: { emergencyType?: string; severity?: string; companyId?: string; status?: string }) {
    return this.emergencyPlansService.findAll(filters);
  }

  @Post('upload')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO')
  @UseInterceptors(memoryUpload({ maxBytes: 25 * 1024 * 1024, kind: 'document' }))
  async uploadFile(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const host = `${req.protocol}://${req.get('host')}`;
    const fileUrl = await this.storage.uploadFile(file, host, 'nodo360/plans');
    return {
      fileUrl,
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
  @UseInterceptors(memoryUpload({ maxBytes: 25 * 1024 * 1024, kind: 'document' }))
  async addAttachment(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('name') name: string,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const host = `${req.protocol}://${req.get('host')}`;
    const fileUrl = await this.storage.uploadFile(file, host, 'nodo360/plans');
    return this.emergencyPlansService.addAttachment(id, {
      name: name || file.originalname,
      fileUrl,
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
