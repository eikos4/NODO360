import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IncidentsModule } from '../incidents/incidents.module';
import { IncidentTimelineController } from './incident-timeline.controller';
import { IncidentTimelineService } from './incident-timeline.service';

@Module({
  imports: [IncidentsModule],
  controllers: [IncidentTimelineController],
  providers: [IncidentTimelineService, RolesGuard],
  exports: [IncidentTimelineService],
})
export class IncidentTimelineModule {}
