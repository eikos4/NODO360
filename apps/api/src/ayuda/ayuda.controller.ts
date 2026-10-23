import { Controller, Get } from '@nestjs/common';
import { InstagramReelsService } from './instagram-reels.service';

@Controller('ayuda')
export class AyudaController {
  constructor(private readonly instagram: InstagramReelsService) {}

  @Get('instagram-reels')
  listInstagramReels() {
    return this.instagram.listReels();
  }
}
