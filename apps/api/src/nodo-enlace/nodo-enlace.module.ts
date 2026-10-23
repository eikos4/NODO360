import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NodoEnlaceController } from './nodo-enlace.controller';
import { NodoEnlaceService } from './nodo-enlace.service';

@Module({
  imports: [PrismaModule],
  controllers: [NodoEnlaceController],
  providers: [NodoEnlaceService],
})
export class NodoEnlaceModule {}
