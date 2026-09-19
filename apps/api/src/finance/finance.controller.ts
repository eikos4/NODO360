import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FinanceService } from './finance.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { Actor } from '../common/cuerpo-scope';

const READ_ROLES = ['SUPER_ADMIN', 'TESORERO', 'AUDITOR', 'COMANDANTE'] as const;
const WRITE_ROLES = ['SUPER_ADMIN', 'TESORERO', 'COMANDANTE'] as const;

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private service: FinanceService) {}

  @Get('dashboard')
  @Roles(...READ_ROLES)
  getDashboard(@Query('companyId') companyId: string | undefined, @Req() req: { user: Actor }) {
    return this.service.getDashboard(req.user, companyId);
  }

  @Get('budgets')
  @Roles(...READ_ROLES)
  findBudgets(
    @Query('companyId') companyId: string | undefined,
    @Query('year') year: string | undefined,
    @Req() req: { user: Actor },
  ) {
    return this.service.findBudgets(req.user, companyId, year ? Number(year) : undefined);
  }

  @Get('budgets/:id')
  @Roles(...READ_ROLES)
  findBudgetById(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.service.findBudgetById(id, req.user);
  }

  @Post('budgets')
  @Roles(...WRITE_ROLES)
  createBudget(@Body() dto: CreateBudgetDto, @Req() req: { user: Actor }) {
    return this.service.createBudget(dto, req.user);
  }

  @Put('budgets/:id')
  @Roles(...WRITE_ROLES)
  updateBudget(@Param('id') id: string, @Body() dto: Partial<CreateBudgetDto>, @Req() req: { user: Actor }) {
    return this.service.updateBudget(id, dto, req.user);
  }

  @Delete('budgets/:id')
  @Roles('SUPER_ADMIN', 'TESORERO')
  deleteBudget(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.service.deleteBudget(id, req.user);
  }
}
