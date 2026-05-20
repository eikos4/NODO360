import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InventoryService } from './inventory.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const imageStorage = diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + extname(file.originalname));
  },
});

const imageFilter = (_req: any, file: any, cb: any) => {
  /\.(jpg|jpeg|png|gif|webp)$/i.test(extname(file.originalname))
    ? cb(null, true)
    : cb(new BadRequestException('Solo se permiten imágenes (jpg, png, gif, webp)'), false);
};

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('dashboard/stats')
  getDashboardStats(@Query('companyId') companyId?: string) {
    return this.inventoryService.getDashboardStats(companyId);
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────

  @Get('alerts')
  getAlerts(@Query('companyId') companyId?: string) {
    return this.inventoryService.getAlerts(companyId);
  }

  // ─── Image Upload ─────────────────────────────────────────────────────────

  @Post('vehicles/upload-image')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  @UseInterceptors(FileInterceptor('file', { storage: imageStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFilter }))
  async uploadVehicleImage(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const host = `${req.protocol}://${req.get('host')}`;
    return { imageUrl: `${host}/uploads/${file.filename}` };
  }

  @Post('equipment/upload-image')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  @UseInterceptors(FileInterceptor('file', { storage: imageStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFilter }))
  async uploadEquipmentImage(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const host = `${req.protocol}://${req.get('host')}`;
    return { imageUrl: `${host}/uploads/${file.filename}` };
  }

  // ─── Equipment ────────────────────────────────────────────────────────────

  @Get('equipment')
  findAllEquipment(
    @Query('companyId') companyId?: string,
    @Query('category') category?: string,
  ) {
    return this.inventoryService.findAllEquipment(companyId, category);
  }

  @Get('equipment/:id')
  findEquipmentById(@Param('id') id: string) {
    return this.inventoryService.findEquipmentById(id);
  }

  @Post('equipment')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  createEquipment(@Body() dto: CreateEquipmentDto) {
    return this.inventoryService.createEquipment(dto);
  }

  @Put('equipment/:id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  updateEquipment(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.inventoryService.updateEquipment(id, dto);
  }

  @Delete('equipment/:id')
  @Roles('SUPER_ADMIN', 'ENCARGADO_MATERIAL')
  deleteEquipment(@Param('id') id: string) {
    return this.inventoryService.deleteEquipment(id);
  }

  // ─── Vehicles ─────────────────────────────────────────────────────────────

  @Get('vehicles')
  findAllVehicles(@Query('companyId') companyId?: string) {
    return this.inventoryService.findAllVehicles(companyId);
  }

  @Get('vehicles/:id')
  findVehicleById(@Param('id') id: string) {
    return this.inventoryService.findVehicleById(id);
  }

  @Post('vehicles')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  createVehicle(@Body() dto: CreateVehicleDto) {
    return this.inventoryService.createVehicle(dto);
  }

  @Put('vehicles/:id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL')
  updateVehicle(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.inventoryService.updateVehicle(id, dto);
  }

  @Delete('vehicles/:id')
  @Roles('SUPER_ADMIN', 'ENCARGADO_MATERIAL')
  deleteVehicle(@Param('id') id: string) {
    return this.inventoryService.deleteVehicle(id);
  }
}
