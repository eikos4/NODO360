import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { DispatchCentralModule } from '../dispatch-central/dispatch-central.module';
import { EmergencyResponseController } from './emergency-response.controller';
import { EmergencyResponseService } from './emergency-response.service';

@Module({
  imports: [PrismaModule, DispatchCentralModule],
  controllers: [EmergencyResponseController],
  providers: [EmergencyResponseService, RolesGuard],
  exports: [EmergencyResponseService],
})
export class EmergencyResponseModule {}
