import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  providers: [InventoryService, RolesGuard],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
