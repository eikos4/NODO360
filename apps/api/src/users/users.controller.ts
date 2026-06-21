import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Delete, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL')
  findAll(@Query('companyId') companyId?: string) {
    return this.usersService.findAll(companyId);
  }

  @Post('upload-photo')
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  @UseInterceptors(FileInterceptor('file', { storage: imageStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }))
  async uploadPhoto(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const host = `${req.protocol}://${req.get('host')}`;
    return { photoUrl: `${host}/uploads/${file.filename}` };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
