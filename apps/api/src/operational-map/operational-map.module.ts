import { Module } from '@nestjs/common';
import { OperationalMapService } from './operational-map.service';
import { OperationalMapController } from './operational-map.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OperationalMapController],
  providers: [OperationalMapService],
})
export class OperationalMapModule {}
