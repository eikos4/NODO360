import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
  providers: [FinanceService, RolesGuard],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
