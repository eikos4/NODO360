import { Module } from '@nestjs/common';
import { EmergencyPlansService } from './emergency-plans.service';
import { EmergencyPlansController } from './emergency-plans.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmergencyPlansController],
  providers: [EmergencyPlansService],
  exports: [EmergencyPlansService],
})
export class EmergencyPlansModule {}
