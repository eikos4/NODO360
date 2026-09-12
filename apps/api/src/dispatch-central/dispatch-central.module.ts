import { Module } from '@nestjs/common';
import { DispatchCentralService } from './dispatch-central.service';
import { DispatchCentralController } from './dispatch-central.controller';
import { StandbyAlertService } from './standby-alert.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmergencyRealtimeModule } from '../emergency-realtime/emergency-realtime.module';

@Module({
  imports: [PrismaModule, NotificationsModule, EmergencyRealtimeModule],
  controllers: [DispatchCentralController],
  providers: [DispatchCentralService, StandbyAlertService],
  exports: [DispatchCentralService, StandbyAlertService],
})
export class DispatchCentralModule {}
