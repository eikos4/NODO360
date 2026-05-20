import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InventoryAuditsController } from './inventory-audits.controller';
import { InventoryAuditsService } from './inventory-audits.service';

@Module({
  controllers: [InventoryAuditsController],
  providers: [InventoryAuditsService, RolesGuard],
  exports: [InventoryAuditsService],
})
export class InventoryAuditsModule {}
