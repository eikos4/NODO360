import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IncidentLocationPinService } from './incident-location-pin.service';
import { ConfirmIncidentLocationDto } from './dto/confirm-incident-location.dto';

@Controller('location-pin')
export class IncidentLocationPinController {
  constructor(private readonly service: IncidentLocationPinService) {}

  /** Datos públicos de la emergencia para la página de captura GPS */
  @Get(':token')
  getPublic(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  /** Confirmar ubicación GPS desde el teléfono (sin login) */
  @Post(':token/confirm')
  confirm(@Param('token') token: string, @Body() dto: ConfirmIncidentLocationDto) {
    return this.service.confirm(token, dto);
  }

  /** PRE-DISPATCH: Polling desde Botonera */
  @Get('pre-dispatch/:token')
  pollPreDispatch(@Param('token') token: string) {
    return this.service.pollPreDispatch(token);
  }

  /** PRE-DISPATCH: Confirmar ubicación desde el teléfono sin incidente creado */
  @Post('pre-dispatch/:token/confirm')
  confirmPreDispatch(@Param('token') token: string, @Body() dto: ConfirmIncidentLocationDto) {
    return this.service.submitPreDispatch(token, dto.latitude, dto.longitude, dto.note);
  }
}
