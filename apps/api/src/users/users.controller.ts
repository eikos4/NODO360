import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Delete, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { StorageService } from '../storage/storage.service';
import { memoryUpload } from '../storage/upload.interceptor';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { assignedRoles, hasAnyRole } from '../common/user-roles';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private storageService: StorageService
  ) {}

  @Get()
  @Roles('KODESK', 'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL')
  findAll(@Query('companyId') companyId?: string, @Req() req?: any) {
    return this.usersService.findAll(companyId, req?.user);
  }

  @Post('upload-photo')
  @Roles('KODESK', 'SUPER_ADMIN', 'COMANDANTE')
  @UseInterceptors(memoryUpload({ maxBytes: 5 * 1024 * 1024, kind: 'image' }))
  async uploadPhoto(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('Imagen requerida');
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = await this.storageService.uploadFile(file, hostUrl, 'nodo360/users');
    return { photoUrl: fileUrl };
  }

  @Get(':id')
  @Roles('KODESK', 'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.usersService.findById(id, req.user);
  }

  @Post()
  @Roles('KODESK', 'SUPER_ADMIN', 'COMANDANTE')
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    if (assignedRoles(dto.role, dto.roles).includes('KODESK') && !hasAnyRole(req.user, 'KODESK')) {
      throw new ForbiddenException('El perfil Kodesk solo lo asigna Kodesk');
    }
    return this.usersService.create(dto, req.user);
  }

  @Put(':id')
  @Roles('KODESK', 'SUPER_ADMIN', 'COMANDANTE')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    if (assignedRoles(dto.role, dto.roles).includes('KODESK') && !hasAnyRole(req.user, 'KODESK')) {
      throw new ForbiddenException('El perfil Kodesk solo lo asigna Kodesk');
    }
    return this.usersService.update(id, dto, req.user);
  }

  @Post(':id/deactivate')
  @Roles('KODESK', 'SUPER_ADMIN', 'COMANDANTE')
  deactivate(@Param('id') id: string, @Req() req: any) {
    return this.usersService.deactivate(id, req.user);
  }

  @Delete(':id')
  @Roles('KODESK', 'SUPER_ADMIN')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.usersService.remove(id, req.user);
  }
}
