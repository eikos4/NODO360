import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { EmergencyBroadcaster } from './emergency-broadcaster.service';
import { EmergencyGateway } from './emergency.gateway';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [EmergencyGateway, EmergencyBroadcaster],
  exports: [EmergencyBroadcaster],
})
export class EmergencyRealtimeModule {}
