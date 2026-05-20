import { Module } from '@nestjs/common';
import { EvacuationService } from './evacuation.service';
import { EvacuationController } from './evacuation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EvacuationController],
  providers: [EvacuationService],
  exports: [EvacuationService],
})
export class EvacuationModule {}
