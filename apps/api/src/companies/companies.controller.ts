import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { StorageService } from '../storage/storage.service';
import { memoryUpload } from '../storage/upload.interceptor';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(
    private companiesService: CompaniesService,
    private storageService: StorageService
  ) {}

  @Post('upload-logo')
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  @UseInterceptors(memoryUpload({ maxBytes: 5 * 1024 * 1024, kind: 'image' }))
  async uploadLogo(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = await this.storageService.uploadFile(file, hostUrl, 'nodo360/companies');
    return { logoUrl: fileUrl };
  }

  @Post('upload-image')
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  @UseInterceptors(memoryUpload({ maxBytes: 10 * 1024 * 1024, kind: 'image' }))
  async uploadHeadquartersImage(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = await this.storageService.uploadFile(file, hostUrl, 'nodo360/companies');
    return { headquartersImageUrl: fileUrl };
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
