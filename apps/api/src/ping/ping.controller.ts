import { Controller, Get } from '@nestjs/common';

@Controller('ping')
export class PingController {
  @Get()
  ping() {
    return {
      ok: true,
      service: 'NODO360 API',
      timestamp: new Date().toISOString(),
    };
  }
}
