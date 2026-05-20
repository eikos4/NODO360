import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FleetLogsController } from './fleet-logs.controller';
import { FleetLogsService } from './fleet-logs.service';

@Module({
  controllers: [FleetLogsController],
  providers: [FleetLogsService, RolesGuard],
  exports: [FleetLogsService],
})
export class FleetLogsModule {}
