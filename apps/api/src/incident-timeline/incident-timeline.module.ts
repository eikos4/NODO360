import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DispatchCentralModule } from '../dispatch-central/dispatch-central.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { IncidentTimelineController } from './incident-timeline.controller';
import { IncidentTimelineService } from './incident-timeline.service';

@Module({
  imports: [IncidentsModule, DispatchCentralModule],
  controllers: [IncidentTimelineController],
  providers: [IncidentTimelineService, RolesGuard],
  exports: [IncidentTimelineService],
})
export class IncidentTimelineModule {}
