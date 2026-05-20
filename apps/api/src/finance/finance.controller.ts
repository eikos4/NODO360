import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FinanceService } from './finance.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private service: FinanceService) {}

  @Get('dashboard')
  getDashboard(@Query('companyId') companyId?: string) { return this.service.getDashboard(companyId); }

  @Get('budgets')
  findBudgets(@Query('companyId') companyId?: string, @Query('year') year?: string) {
    return this.service.findBudgets(companyId, year ? Number(year) : undefined);
  }

  @Get('budgets/:id')
  findBudgetById(@Param('id') id: string) { return this.service.findBudgetById(id); }

  @Post('budgets')
  @Roles('SUPER_ADMIN', 'TESORERO', 'COMANDANTE')
  createBudget(@Body() dto: CreateBudgetDto) { return this.service.createBudget(dto); }

  @Put('budgets/:id')
  @Roles('SUPER_ADMIN', 'TESORERO', 'COMANDANTE')
  updateBudget(@Param('id') id: string, @Body() dto: Partial<CreateBudgetDto>) {
    return this.service.updateBudget(id, dto);
  }

  @Delete('budgets/:id')
  @Roles('SUPER_ADMIN', 'TESORERO')
  deleteBudget(@Param('id') id: string) { return this.service.deleteBudget(id); }
}
