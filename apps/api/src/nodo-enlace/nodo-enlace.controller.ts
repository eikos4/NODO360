import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Actor } from '../common/cuerpo-scope';
import { NodoEnlaceService, NODO_ENLACE_ROLES } from './nodo-enlace.service';
import { RequestLinkDto } from './dto/request-link.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('nodo-enlace')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...NODO_ENLACE_ROLES)
export class NodoEnlaceController {
  constructor(private readonly service: NodoEnlaceService) {}

  @Get('network')
  getNetwork(@Req() req: { user: Actor }, @Query('asCuerpoId') asCuerpoId?: string) {
    return this.service.getNetwork(req.user, asCuerpoId);
  }

  @Post('links')
  requestLink(@Body() dto: RequestLinkDto, @Req() req: { user: Actor }) {
    return this.service.requestLink(req.user, dto);
  }

  @Post('links/:id/accept')
  accept(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.service.acceptLink(req.user, id);
  }

  @Post('links/:id/close')
  close(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.service.closeLink(req.user, id);
  }

  @Get('links/:id')
  getLink(@Param('id') id: string, @Req() req: { user: Actor }) {
    return this.service.getLink(req.user, id);
  }

  @Get('links/:id/messages')
  listMessages(
    @Param('id') id: string,
    @Query('after') after: string | undefined,
    @Req() req: { user: Actor },
  ) {
    return this.service.listMessages(req.user, id, after);
  }

  @Post('links/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req: { user: Actor },
  ) {
    return this.service.sendMessage(req.user, id, dto);
  }
}
