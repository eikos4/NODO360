import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { DispatchCentralModule } from '../dispatch-central/dispatch-central.module';
import { EmergencyResponseController } from './emergency-response.controller';
import { EmergencyResponseService } from './emergency-response.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmergencyRealtimeModule } from '../emergency-realtime/emergency-realtime.module';

@Module({
  imports: [PrismaModule, DispatchCentralModule, NotificationsModule, EmergencyRealtimeModule],
  controllers: [EmergencyResponseController],
  providers: [EmergencyResponseService, RolesGuard],
  exports: [EmergencyResponseService],
})
export class EmergencyResponseModule {}
