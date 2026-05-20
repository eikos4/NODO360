import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private service: ShiftsService) {}

  @Get('upcoming')
  getUpcoming(@Query('companyId') companyId?: string) {
    return this.service.getUpcoming(companyId);
  }

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(userId, companyId, from, to);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  create(@Body() dto: CreateShiftDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  update(@Param('id') id: string, @Body() dto: Partial<CreateShiftDto>) {
    return this.service.update(id, dto);
  }

  @Patch(':id/present')
  @Roles('SUPER_ADMIN', 'COMANDANTE', 'CAPITAN')
  markPresent(@Param('id') id: string, @Body('present') present: boolean) {
    return this.service.markPresent(id, present);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COMANDANTE')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
