import { Module } from '@nestjs/common';
import { DispatchCentralService } from './dispatch-central.service';
import { DispatchCentralController } from './dispatch-central.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DispatchCentralController],
  providers: [DispatchCentralService],
  exports: [DispatchCentralService],
})
export class DispatchCentralModule {}
