import { Module } from '@nestjs/common';
import { IncidentLocationPinController } from './incident-location-pin.controller';
import { IncidentLocationPinService } from './incident-location-pin.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmergencyRealtimeModule } from '../emergency-realtime/emergency-realtime.module';

@Module({
  imports: [NotificationsModule, EmergencyRealtimeModule],
  controllers: [IncidentLocationPinController],
  providers: [IncidentLocationPinService],
  exports: [IncidentLocationPinService],
})
export class IncidentLocationPinModule {}
