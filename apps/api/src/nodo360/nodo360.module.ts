import { Module } from '@nestjs/common';
import { Nodo360Controller } from './nodo360.controller';
import { Nodo360Service } from './nodo360.service';
import { Nodo360ReportsService } from './nodo360-reports.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [Nodo360Controller],
  providers: [Nodo360Service, Nodo360ReportsService],
})
export class Nodo360Module {}
