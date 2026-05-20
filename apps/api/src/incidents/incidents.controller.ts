import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { DispatchIncidentDto } from './dto/dispatch-incident.dto';
import { UpdateIncidentChecklistDto } from './dto/update-incident-checklist.dto';

@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidentsController {
  constructor(private service: IncidentsService) {}

  @Get('stats')
  getStats(@Query('companyId') companyId?: string) {
    return this.service.getStats(companyId);
  }

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.service.findAll(companyId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('upload-image')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  @UseInterceptors(FileInterceptor('file', { storage: imageStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFilter }))
  async uploadImage(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const host = `${req.protocol}://${req.get('host')}`;
    return { imageUrl: `${host}/uploads/${file.filename}` };
  }

  @Patch(':id/checklist')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  updateChecklist(@Param('id') id: string, @Body() dto: UpdateIncidentChecklistDto) {
    return this.service.updateChecklist(id, dto);
  }

  @Post('dispatch')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  dispatch(@Body() dto: DispatchIncidentDto, @Req() req: any) {
    return this.service.dispatch(dto, req.user?.id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  create(@Body() dto: CreateIncidentDto, @Req() req: any) {
    return this.service.create(dto, req.user?.id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  update(@Param('id') id: string, @Body() dto: UpdateIncidentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
