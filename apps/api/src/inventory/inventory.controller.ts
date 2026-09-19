import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InventoryService } from './inventory.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { StorageService } from '../storage/storage.service';
import { memoryUpload } from '../storage/upload.interceptor';
import { Actor } from '../common/cuerpo-scope';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private storage: StorageService,
  ) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('dashboard/stats')
  getDashboardStats(@Query('companyId') companyId?: string, @Req() req?: { user: Actor }) {
    return this.inventoryService.getDashboardStats(req!.user, companyId);
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────

  @Get('alerts')
  getAlerts(@Query('companyId') companyId?: string, @Req() req?: { user: Actor }) {
    return this.inventoryService.getAlerts(req!.user, companyId);
  }

  // ─── Image Upload ─────────────────────────────────────────────────────────

  @Post('vehicles/upload-image')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  @UseInterceptors(memoryUpload({ maxBytes: 10 * 1024 * 1024, kind: 'image' }))
  async uploadVehicleImage(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const host = `${req.protocol}://${req.get('host')}`;
    return { imageUrl: await this.storage.uploadFile(file, host, 'nodo360/vehicles') };
  }

  @Post('equipment/upload-image')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  @UseInterceptors(memoryUpload({ maxBytes: 10 * 1024 * 1024, kind: 'image' }))
  async uploadEquipmentImage(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const host = `${req.protocol}://${req.get('host')}`;
    return { imageUrl: await this.storage.uploadFile(file, host, 'nodo360/equipment') };
  }

  // ─── Equipment ────────────────────────────────────────────────────────────

  @Get('equipment')
  findAllEquipment(
    @Query('companyId') companyId?: string,
    @Query('category') category?: string,
    @Req() req?: { user: Actor },
  ) {
    return this.inventoryService.findAllEquipment(req!.user, companyId, category);
  }

  @Get('equipment/:id')
  findEquipmentById(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.inventoryService.findEquipmentById(id, req.user);
  }

  @Post('equipment')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  createEquipment(@Body() dto: CreateEquipmentDto, @Req() req: { user: Actor }) {
    return this.inventoryService.createEquipment(dto, req.user);
  }

  @Put('equipment/:id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  updateEquipment(@Param('id') id: string, @Body() dto: UpdateEquipmentDto, @Req() req: { user: Actor }) {
    return this.inventoryService.updateEquipment(id, dto, req.user);
  }

  @Delete('equipment/:id')
  @Roles('SUPER_ADMIN', 'ENCARGADO_MATERIAL')
  deleteEquipment(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.inventoryService.deleteEquipment(id, req.user);
  }

  // ─── Vehicles ─────────────────────────────────────────────────────────────

  @Get('vehicles')
  findAllVehicles(@Query('companyId') companyId?: string, @Req() req?: { user: Actor }) {
    return this.inventoryService.findAllVehicles(req!.user, companyId);
  }

  @Get('vehicles/:id')
  findVehicleById(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.inventoryService.findVehicleById(id, req.user);
  }

  @Post('vehicles')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  createVehicle(@Body() dto: CreateVehicleDto, @Req() req: { user: Actor }) {
    return this.inventoryService.createVehicle(dto, req.user);
  }

  @Put('vehicles/:id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  updateVehicle(@Param('id') id: string, @Body() dto: UpdateVehicleDto, @Req() req: { user: Actor }) {
    return this.inventoryService.updateVehicle(id, dto, req.user);
  }

  @Delete('vehicles/:id')
  @Roles('SUPER_ADMIN', 'ENCARGADO_MATERIAL')
  deleteVehicle(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.inventoryService.deleteVehicle(id, req.user);
  }
}
