import { Module } from '@nestjs/common';
import { HydrantsService } from './hydrants.service';
import { HydrantsController } from './hydrants.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HydrantsController],
  providers: [HydrantsService],
  exports: [HydrantsService],
})
export class HydrantsModule {}
