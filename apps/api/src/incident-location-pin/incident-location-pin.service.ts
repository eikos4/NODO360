import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmIncidentLocationDto } from './dto/confirm-incident-location.dto';

@Injectable()
export class IncidentLocationPinService {
  private preDispatchPins = new Map<string, { lat: number; lng: number; note?: string }>();

  constructor(private prisma: PrismaService) {}

  submitPreDispatch(token: string, lat: number, lng: number, note?: string) {
    this.preDispatchPins.set(token, { lat, lng, note });
    // Borrar de memoria despues de 30 mins para no acumular basura
    setTimeout(() => this.preDispatchPins.delete(token), 30 * 60 * 1000);
    return { ok: true };
  }

  pollPreDispatch(token: string) {
    const data = this.preDispatchPins.get(token);
    return { found: !!data, data: data || null };
  }

  async getByToken(token: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { locationPinToken: token },
      select: {
        id: true,
        code: true,
        type: true,
        description: true,
        address: true,
        latitude: true,
        longitude: true,
        confirmedLatitude: true,
        confirmedLongitude: true,
        locationPinAt: true,
        locationPinNote: true,
        dispatchedAt: true,
        closedAt: true,
        company: { select: { id: true, name: true, number: true, logoUrl: true, city: true } },
        vehicles: {
          select: {
            vehicle: { select: { patent: true, type: true } },
          },
        },
      },
    });

    if (!incident) throw new NotFoundException('Enlace no válido o expirado');
    if (incident.closedAt) throw new GoneException('Esta emergencia ya fue cerrada');

    const hasDispatchGps = incident.latitude != null && incident.longitude != null;
    const hasFieldGps = incident.confirmedLatitude != null && incident.confirmedLongitude != null;

    return {
      id: incident.id,
      code: incident.code,
      type: incident.type,
      description: incident.description,
      address: incident.address,
      dispatchedAt: incident.dispatchedAt,
      company: incident.company,
      vehicles: incident.vehicles.map((v) => v.vehicle),
      dispatchGps: hasDispatchGps
        ? { latitude: incident.latitude!, longitude: incident.longitude! }
        : null,
      fieldGps: hasFieldGps
        ? {
            latitude: incident.confirmedLatitude!,
            longitude: incident.confirmedLongitude!,
            confirmedAt: incident.locationPinAt,
            note: incident.locationPinNote,
          }
        : null,
      alreadyConfirmed: hasFieldGps,
    };
  }

  async confirm(token: string, dto: ConfirmIncidentLocationDto) {
    const incident = await this.prisma.incident.findUnique({
      where: { locationPinToken: token },
      select: { id: true, closedAt: true, companyId: true, latitude: true, longitude: true },
    });

    if (!incident) throw new NotFoundException('Enlace no válido o expirado');
    if (incident.closedAt) throw new GoneException('Esta emergencia ya fue cerrada');

    if (!Number.isFinite(dto.latitude) || !Number.isFinite(dto.longitude)) {
      throw new BadRequestException('Coordenadas GPS inválidas');
    }

    const updated = await this.prisma.incident.update({
      where: { id: incident.id },
      data: {
        confirmedLatitude: dto.latitude,
        confirmedLongitude: dto.longitude,
        locationPinAt: new Date(),
        locationPinNote: dto.note?.trim() || null,
        ...(incident.latitude == null ? { latitude: dto.latitude } : {}),
        ...(incident.longitude == null ? { longitude: dto.longitude } : {}),
      },
      select: {
        id: true,
        code: true,
        companyId: true,
        confirmedLatitude: true,
        confirmedLongitude: true,
        locationPinAt: true,
      },
    });

    return {
      ok: true,
      incidentId: updated.id,
      code: updated.code,
      companyId: updated.companyId,
      fieldGps: {
        latitude: updated.confirmedLatitude!,
        longitude: updated.confirmedLongitude!,
        confirmedAt: updated.locationPinAt,
      },
    };
  }
}
