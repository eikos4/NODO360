import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DispatchCentralService } from './dispatch-central.service';
import { DispatchCentralController } from './dispatch-central.controller';
import { StandbyAlertService } from './standby-alert.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmergencyRealtimeModule } from '../emergency-realtime/emergency-realtime.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    EmergencyRealtimeModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [DispatchCentralController],
  providers: [DispatchCentralService, StandbyAlertService],
  exports: [DispatchCentralService, StandbyAlertService],
})
export class DispatchCentralModule {}
