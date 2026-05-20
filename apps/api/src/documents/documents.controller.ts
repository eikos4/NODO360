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
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Get('expiring')
  getExpiring() { return this.service.getExpiring(); }

  @Get()
  findAll(@Query('companyId') companyId?: string, @Query('category') category?: string) {
    return this.service.findAll(companyId, category);
  }

  @Get(':id')
  findById(@Param('id') id: string) { return this.service.findById(id); }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOADS_DIR,
      filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, unique + extname(file.originalname));
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = /pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|gif|zip|txt/i;
      allowed.test(extname(file.originalname)) ? cb(null, true) : cb(new BadRequestException('Tipo de archivo no permitido'), false);
    },
  }))
  async uploadFile(
    @UploadedFile() file: any,
    @Body() body: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const host = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${host}/uploads/${file.filename}`;
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
