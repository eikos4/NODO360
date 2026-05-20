import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';

@Module({
  providers: [ShiftsService, RolesGuard],
  controllers: [ShiftsController],
  exports: [ShiftsService],
})
export class ShiftsModule {}
