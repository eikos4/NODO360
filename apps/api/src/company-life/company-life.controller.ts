import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyLifeService } from './company-life.service';
import { CreateLifeItemDto } from './dto/create-life-item.dto';
import { UpdateLifeItemDto } from './dto/update-life-item.dto';

@Controller('compania')
@UseGuards(JwtAuthGuard)
export class CompanyLifeController {
  constructor(private readonly service: CompanyLifeService) {}

  @Get('board')
  board(
    @Req() req: { user: { id: string; role?: string; roles?: string[]; companyId?: string | null; cuerpoId?: string | null } },
    @Query('companyId') companyId?: string,
  ) {
    return this.service.getBoard(req.user, companyId);
  }

  @Post('items')
  create(
    @Req() req: { user: { id: string; role?: string; roles?: string[]; companyId?: string | null; cuerpoId?: string | null } },
    @Body() dto: CreateLifeItemDto,
  ) {
    return this.service.create(req.user, dto);
  }

  @Patch('items/:id')
  update(
    @Param('id') id: string,
    @Req() req: { user: { id: string; role?: string; roles?: string[]; companyId?: string | null; cuerpoId?: string | null } },
    @Body() dto: UpdateLifeItemDto,
  ) {
    return this.service.update(id, req.user, dto);
  }

  @Delete('items/:id')
  remove(
    @Param('id') id: string,
    @Req() req: { user: { id: string; role?: string; roles?: string[]; companyId?: string | null; cuerpoId?: string | null } },
  ) {
    return this.service.remove(id, req.user);
  }
}
