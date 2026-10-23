import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyLifeController } from './company-life.controller';
import { CompanyLifeService } from './company-life.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyLifeController],
  providers: [CompanyLifeService],
  exports: [CompanyLifeService],
})
export class CompanyLifeModule {}
