import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';

@Module({
  providers: [PurchasesService, RolesGuard],
  controllers: [PurchasesController],
  exports: [PurchasesService],
})
export class PurchasesModule {}
