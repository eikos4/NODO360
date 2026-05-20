import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

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

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post('upload-logo')
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  @UseInterceptors(FileInterceptor('file', { storage: imageStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }))
  async uploadLogo(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    return { logoUrl: `${req.protocol}://${req.get('host')}/uploads/${file.filename}` };
  }

  @Post('upload-image')
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  @UseInterceptors(FileInterceptor('file', { storage: imageStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFilter }))
  async uploadHeadquartersImage(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    return { headquartersImageUrl: `/uploads/${file.filename}` };
  }

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findById(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  deactivate(@Param('id') id: string) {
    return this.companiesService.deactivate(id);
  }
}
