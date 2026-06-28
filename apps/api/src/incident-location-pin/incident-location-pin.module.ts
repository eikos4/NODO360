import { Module } from '@nestjs/common';
import { IncidentLocationPinController } from './incident-location-pin.controller';
import { IncidentLocationPinService } from './incident-location-pin.service';

@Module({
  controllers: [IncidentLocationPinController],
  providers: [IncidentLocationPinService],
  exports: [IncidentLocationPinService],
})
export class IncidentLocationPinModule {}
