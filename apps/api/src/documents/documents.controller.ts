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
import { Actor } from '../common/cuerpo-scope';

const READ_ROLES = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO', 'TESORERO', 'AUDITOR'] as const;
const WRITE_ROLES = ['SUPER_ADMIN', 'SECRETARIO', 'COMANDANTE'] as const;

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(
    private service: DocumentsService,
    private storage: StorageService,
  ) {}

  @Get('expiring')
  @Roles(...READ_ROLES)
  getExpiring(@Req() req: { user: Actor }) {
    return this.service.getExpiring(req.user);
  }

  @Get()
  @Roles(...READ_ROLES)
  findAll(
    @Query('companyId') companyId: string | undefined,
    @Query('category') category: string | undefined,
    @Req() req: { user: Actor },
  ) {
    return this.service.findAll(req.user, companyId, category);
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  findById(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.service.findByIdAuthorized(id, req.user);
  }

  @Post('upload')
  @Roles(...WRITE_ROLES)
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
    return this.service.create(dto, req.user);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Body() dto: CreateDocumentDto, @Req() req: { user: Actor }) {
    return this.service.create(dto, req.user);
  }

  @Put(':id')
  @Roles(...WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: Partial<CreateDocumentDto>, @Req() req: { user: Actor }) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  delete(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.service.delete(id, req.user);
  }
}
