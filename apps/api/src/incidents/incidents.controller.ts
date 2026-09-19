import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IncidentAuthUser, IncidentsService } from './incidents.service';
import { StorageService } from '../storage/storage.service';
import { memoryUpload } from '../storage/upload.interceptor';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { AssignIncidentVehiclesDto } from './dto/assign-incident-vehicles.dto';
import { DispatchIncidentDto } from './dto/dispatch-incident.dto';
import { UpdateIncidentChecklistDto } from './dto/update-incident-checklist.dto';

@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidentsController {
  constructor(
    private service: IncidentsService,
    private storageService: StorageService
  ) {}

  @Get('stats')
  async getStats(@Req() req: { user: IncidentAuthUser }, @Query('companyId') companyId?: string) {
    return this.service.getStatsAuthorized(req.user, companyId);
  }

  @Get()
  @Roles(
    'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL', 'SECRETARIO', 'KODESK',
    'BOMBERO', 'BOMBERO_HONORARIO', 'BOMBERO_INICIAL', 'BOMBERO_PROFESIONAL', 'ENCARGADO_MATERIAL',
  )
  findAll(@Req() req: { user: IncidentAuthUser }, @Query('companyId') companyId?: string) {
    return this.service.findAllAuthorized(req.user, companyId);
  }

  @Get(':id/report')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL', 'SECRETARIO', 'KODESK')
  getReport(@Param('id') id: string, @Req() req: { user: IncidentAuthUser }) {
    return this.service.getReportPack(id, req.user);
  }

  @Post(':id/close')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL')
  async close(@Param('id') id: string, @Req() req: { user: IncidentAuthUser }) {
    return this.service.close(id, req.user);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: { user: IncidentAuthUser }) {
    return this.service.findByIdAuthorized(id, req.user);
  }

  @Post('upload-image')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  @UseInterceptors(memoryUpload({ maxBytes: 10 * 1024 * 1024, kind: 'image' }))
  async uploadImage(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = await this.storageService.uploadFile(file, hostUrl, 'nodo360/incidents');
    return { imageUrl: fileUrl };
  }

  @Patch(':id/checklist')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  async updateChecklist(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentChecklistDto,
    @Req() req: { user: IncidentAuthUser },
  ) {
    await this.service.assertCanManage(id, req.user);
    return this.service.updateChecklist(id, dto);
  }

  @Post('dispatch')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL')
  async dispatch(@Body() dto: DispatchIncidentDto, @Req() req: { user: IncidentAuthUser }) {
    await this.service.assertCanCreateFor(dto.companyId, req.user);
    return this.service.dispatch(dto, req.user?.id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  async create(@Body() dto: CreateIncidentDto, @Req() req: { user: IncidentAuthUser }) {
    await this.service.assertCanCreateFor(dto.companyId, req.user);
    return this.service.create(dto, req.user?.id);
  }

  @Patch(':id/vehicles')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL')
  async assignVehicles(
    @Param('id') id: string,
    @Body() dto: AssignIncidentVehiclesDto,
    @Req() req: { user: IncidentAuthUser },
  ) {
    await this.service.assertCanManage(id, req.user);
    return this.service.update(id, { vehicleIds: dto.vehicleIds });
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @Req() req: { user: IncidentAuthUser },
  ) {
    await this.service.assertCanManage(id, req.user);
    if (dto.companyId) await this.service.assertCanCreateFor(dto.companyId, req.user);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  async delete(@Param('id') id: string, @Req() req: { user: IncidentAuthUser }) {
    await this.service.assertCanManage(id, req.user);
    return this.service.delete(id);
  }
}
