import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { StorageService } from '../storage/storage.service';
import { memoryUpload } from '../storage/upload.interceptor';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(
    private service: DocumentsService,
    private storage: StorageService,
  ) {}

  @Get('expiring')
  getExpiring() { return this.service.getExpiring(); }

  @Get()
  findAll(@Query('companyId') companyId?: string, @Query('category') category?: string) {
    return this.service.findAll(companyId, category);
  }

  @Get(':id')
  findById(@Param('id') id: string) { return this.service.findById(id); }

  @Post('upload')
  @UseInterceptors(memoryUpload({ maxBytes: 20 * 1024 * 1024, kind: 'document' }))
  async uploadFile(
    @UploadedFile() file: any,
    @Body() body: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const host = `${req.protocol}://${req.get('host')}`;
    const fileUrl = await this.storage.uploadFile(file, host, 'nodo360/documents');
    const dto: CreateDocumentDto = {
      title: body.title,
      category: body.category,
      fileUrl,
      uploadedBy: body.uploadedBy ?? 'Sistema',
      expiresAt: body.expiresAt || undefined,
      companyId: body.companyId || undefined,
      notes: body.notes || undefined,
    };
    return this.service.create(dto);
  }

  @Post()
  create(@Body() dto: CreateDocumentDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateDocumentDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'SECRETARIO', 'COMANDANTE')
  delete(@Param('id') id: string) { return this.service.delete(id); }
}
