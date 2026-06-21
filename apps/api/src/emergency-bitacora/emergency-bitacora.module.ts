import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmergencyBitacoraController } from './emergency-bitacora.controller';
import { EmergencyBitacoraService } from './emergency-bitacora.service';

@Module({
  controllers: [EmergencyBitacoraController],
  providers: [EmergencyBitacoraService, RolesGuard],
  exports: [EmergencyBitacoraService],
})
export class EmergencyBitacoraModule {}
