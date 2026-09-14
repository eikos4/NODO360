import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmergencyBitacoraController } from './emergency-bitacora.controller';
import { EmergencyBitacoraService } from './emergency-bitacora.service';
import { DispatchCentralModule } from '../dispatch-central/dispatch-central.module';

@Module({
  imports: [DispatchCentralModule],
  controllers: [EmergencyBitacoraController],
  providers: [EmergencyBitacoraService, RolesGuard],
  exports: [EmergencyBitacoraService],
})
export class EmergencyBitacoraModule {}
