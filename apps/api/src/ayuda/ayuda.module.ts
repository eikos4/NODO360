import { Module } from '@nestjs/common';
import { AyudaController } from './ayuda.controller';
import { InstagramReelsService } from './instagram-reels.service';

@Module({
  controllers: [AyudaController],
  providers: [InstagramReelsService],
})
export class AyudaModule {}
