import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Actor } from '../common/cuerpo-scope';
import { CommandPostService } from './command-post.service';
import {
  CloseCommandPostDto,
  CreateExternalResourceDto,
  CreateNoveltyDto,
  CreatePointDto,
  CreateRequestDto,
  CreateSectorDto,
  OpenCommandPostDto,
  TransferCommandDto,
  UpdateRequestDto,
  UpdateResourceDto,
  UpdateSectorDto,
} from './dto/command-post.dto';

const ACCESS = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'OPERADOR_CENTRAL'] as const;

type ReqUser = Actor & { firstName?: string; lastName?: string };

@Controller('command-posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ACCESS)
export class CommandPostController {
  constructor(private readonly service: CommandPostService) {}

  @Get()
  list(@Req() req: { user: ReqUser }) {
    return this.service.list(req.user);
  }

  @Get('incident/:incidentId')
  snapshot(@Param('incidentId') incidentId: string, @Req() req: { user: ReqUser }) {
    return this.service.snapshot(incidentId, req.user);
  }

  @Get(':id/export')
  exportLog(@Param('id') id: string, @Req() req: { user: ReqUser }) {
    return this.service.exportLog(id, req.user);
  }

  @Post()
  open(@Body() dto: OpenCommandPostDto, @Req() req: { user: ReqUser }) {
    return this.service.open(dto, req.user);
  }

  @Post(':id/transfer')
  transfer(@Param('id') id: string, @Body() dto: TransferCommandDto, @Req() req: { user: ReqUser }) {
    return this.service.transfer(id, dto, req.user);
  }

  @Post(':id/resources')
  addResource(@Param('id') id: string, @Body() dto: CreateExternalResourceDto, @Req() req: { user: ReqUser }) {
    return this.service.addExternalResource(id, dto, req.user);
  }

  @Patch(':id/resources/:resourceId')
  updateResource(
    @Param('id') id: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: UpdateResourceDto,
    @Req() req: { user: ReqUser },
  ) {
    return this.service.updateResource(id, resourceId, dto, req.user);
  }

  @Post(':id/sectors')
  addSector(@Param('id') id: string, @Body() dto: CreateSectorDto, @Req() req: { user: ReqUser }) {
    return this.service.addSector(id, dto, req.user);
  }

  @Patch(':id/sectors/:sectorId')
  updateSector(
    @Param('id') id: string,
    @Param('sectorId') sectorId: string,
    @Body() dto: UpdateSectorDto,
    @Req() req: { user: ReqUser },
  ) {
    return this.service.updateSector(id, sectorId, dto, req.user);
  }

  @Post(':id/novelties')
  addNovelty(@Param('id') id: string, @Body() dto: CreateNoveltyDto, @Req() req: { user: ReqUser }) {
    return this.service.addNovelty(id, dto, req.user);
  }

  @Post(':id/requests')
  addRequest(@Param('id') id: string, @Body() dto: CreateRequestDto, @Req() req: { user: ReqUser }) {
    return this.service.addRequest(id, dto, req.user);
  }

  @Patch(':id/requests/:requestId')
  updateRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() dto: UpdateRequestDto,
    @Req() req: { user: ReqUser },
  ) {
    return this.service.updateRequest(id, requestId, dto, req.user);
  }

  @Post(':id/points')
  addPoint(@Param('id') id: string, @Body() dto: CreatePointDto, @Req() req: { user: ReqUser }) {
    return this.service.addPoint(id, dto, req.user);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseCommandPostDto, @Req() req: { user: ReqUser }) {
    return this.service.close(id, dto, req.user);
  }
}
