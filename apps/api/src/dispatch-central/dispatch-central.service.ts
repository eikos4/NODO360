import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EquipmentStatus, FleetLogType, DispatchSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDispatchCentralDto } from './dto/update-dispatch-central.dto';

export type DispatchPublicStatus = 'DISPONIBLE' | 'NO_DISPONIBLE' | 'OCULTA';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMANDANTE: 'Comandante',
  CAPITAN: 'Capitán',
  ENCARGADO_MATERIAL: 'Enc. Material',
  TESORERO: 'Tesorero',
  SECRETARIO: 'Secretario',
  BOMBERO: 'Bombero',
  AUDITOR: 'Auditor',
};

const VEHICLE_STATUS_LABELS: Record<EquipmentStatus, string> = {
  OPERATIVO: 'Operativo',
  EN_REPARACION: 'En reparación',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

/** Capacidad estimada del estanque (litros) por tipo de carro */
const TANK_CAPACITY_L: Record<string, number> = {
  Escala: 300,
  'Auto Bomba': 250,
  Rescate: 80,
  'Escala Aérea': 400,
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

@Injectable()
export class DispatchCentralService {
  constructor(private prisma: PrismaService) {}

  private mapPublicStatus(
    publicEnabled: boolean,
    available: boolean,
  ): DispatchPublicStatus {
    if (!publicEnabled) return 'OCULTA';
    return available ? 'DISPONIBLE' : 'NO_DISPONIBLE';
  }

  private async getCompanyBySlug(slug: string) {
    const company = await this.prisma.company.findFirst({
      where: { dispatchSlug: slug, isActive: true },
    });
    if (!company || !company.dispatchPublicEnabled) {
      throw new NotFoundException('Central de despachos no disponible');
    }
    return company;
  }

  private mapMember(user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    photoUrl: string | null;
    stationAvailable: boolean;
    stationAvailableAt: Date | null;
    operativeNumber: number | null;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role] ?? user.role,
      photoUrl: user.photoUrl,
      stationAvailable: user.stationAvailable,
      stationAvailableAt: user.stationAvailableAt,
      operativeNumber: user.operativeNumber,
    };
  }

  private estimateFuelLevel(
    vehicleType: string,
    latestFuel: { fuelLiters: number | null; fullTank: boolean } | undefined,
  ): number | null {
    if (!latestFuel) return null;
    const capacity = TANK_CAPACITY_L[vehicleType] ?? 200;
    if (latestFuel.fullTank) return 100;
    if (latestFuel.fuelLiters != null && latestFuel.fuelLiters > 0) {
      return Math.min(100, Math.round((latestFuel.fuelLiters / capacity) * 100));
    }
    return null;
  }

  private mapMaquinista(user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    photoUrl: string | null;
    maquinistaAvailable: boolean;
    maquinistaPrincipal: boolean;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role] ?? user.role,
      photoUrl: user.photoUrl,
      maquinistaAvailable: user.maquinistaAvailable,
      maquinistaPrincipal: user.maquinistaPrincipal,
    };
  }

  async getMaquinistasForCompany(companyId: string) {
    const members = await this.prisma.user.findMany({
      where: { companyId, isActive: true, isMaquinista: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        photoUrl: true,
        maquinistaAvailable: true,
        maquinistaPrincipal: true,
      },
      orderBy: [
        { maquinistaPrincipal: 'desc' },
        { maquinistaAvailable: 'desc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    const mapped = members.map((m) => this.mapMaquinista(m));
    const principal = mapped.find((m) => m.maquinistaPrincipal) ?? null;
    const available = mapped.filter((m) => m.maquinistaAvailable).length;

    return {
      members: mapped,
      principal,
      stats: {
        total: mapped.length,
        available,
        unavailable: mapped.length - available,
      },
    };
  }

  async getFleetForCompany(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId },
      select: {
        id: true,
        patent: true,
        brand: true,
        model: true,
        type: true,
        status: true,
        imageUrl: true,
        principalMaquinista: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            photoUrl: true,
            maquinistaAvailable: true,
            maquinistaPrincipal: true,
          },
        },
      },
      orderBy: { patent: 'asc' },
    });

    if (vehicles.length === 0) {
      return { vehicles: [], stats: { total: 0, operativo: 0, enReparacion: 0, fueraDeServicio: 0 } };
    }

    const vehicleIds = vehicles.map((v) => v.id);
    const fuelLogs = await this.prisma.fleetLog.findMany({
      where: {
        companyId,
        vehicleId: { in: vehicleIds },
        type: FleetLogType.COMBUSTIBLE,
      },
      orderBy: { date: 'desc' },
      select: {
        vehicleId: true,
        fuelLiters: true,
        fullTank: true,
        date: true,
      },
    });

    const latestFuelByVehicle = new Map<string, (typeof fuelLogs)[0]>();
    for (const log of fuelLogs) {
      if (!latestFuelByVehicle.has(log.vehicleId)) {
        latestFuelByVehicle.set(log.vehicleId, log);
      }
    }

    const mapped = vehicles.map((v) => {
      const latestFuel = latestFuelByVehicle.get(v.id);
      const fuelLevelPercent = this.estimateFuelLevel(v.type, latestFuel);
      return {
        id: v.id,
        patent: v.patent,
        brand: v.brand,
        model: v.model,
        type: v.type,
        status: v.status,
        statusLabel: VEHICLE_STATUS_LABELS[v.status],
        imageUrl: v.imageUrl,
        fuelLevelPercent,
        fuelUpdatedAt: latestFuel?.date ?? null,
        principalMaquinista: v.principalMaquinista
          ? this.mapMaquinista(v.principalMaquinista)
          : null,
      };
    });

    return {
      vehicles: mapped,
      stats: {
        total: mapped.length,
        operativo: mapped.filter((v) => v.status === 'OPERATIVO').length,
        enReparacion: mapped.filter((v) => v.status === 'EN_REPARACION').length,
        fueraDeServicio: mapped.filter((v) => v.status === 'FUERA_DE_SERVICIO').length,
      },
    };
  }

  async getRosterForCompany(companyId: string) {
    const members = await this.prisma.user.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        photoUrl: true,
        stationAvailable: true,
        stationAvailableAt: true,
        operativeNumber: true,
      },
      orderBy: [
        { stationAvailable: 'desc' },
        { operativeNumber: 'asc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    const mapped = members.map((m) => this.mapMember(m));
    const available = mapped.filter((m) => m.stationAvailable).length;

    return {
      members: mapped,
      stats: {
        total: mapped.length,
        available,
        unavailable: mapped.length - available,
      },
    };
  }

  private incidentsInvolvingCompany(companyId: string) {
    return {
      OR: [
        { companyId },
        { vehicles: { some: { vehicle: { companyId } } } },
      ],
    };
  }

  async getRecentEmergencies(companyId: string, limit = 10) {
    const incidents = await this.prisma.incident.findMany({
      where: {
        AND: [
          this.incidentsInvolvingCompany(companyId),
          {
            OR: [
              { closedAt: null },
              {
                AND: [{ latitude: { not: null } }, { longitude: { not: null } }],
              },
            ],
          },
        ],
      },
      orderBy: { dispatchedAt: 'desc' },
      take: limit,
      select: {
        companyId: true,
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
        dispatchedAt: true,
        closedAt: true,
        dispatchSource: true,
        company: { select: { number: true, name: true } },
        guardLogEntries: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: {
            author: { select: { firstName: true, lastName: true } },
          },
        },
        participants: {
          take: 5,
          select: {
            user: { select: { firstName: true, lastName: true, role: true } },
          },
        },
        vehicles: {
          select: {
            vehicle: {
              select: { id: true, patent: true, type: true, brand: true, companyId: true },
            },
          },
        },
        bitacoraEntry: { select: { id: true } },
      },
    });

    return this.mapIncidentsToPublic(incidents, companyId);
  }

  private mapIncidentsToPublic(incidents: any[], companyId: string | null) {
    return incidents.map((inc) => {
      const isDispatchOwner = !companyId || inc.companyId === companyId;
      const companyVehicleRows = isDispatchOwner
        ? inc.vehicles
        : inc.vehicles.filter((v: any) => v.vehicle.companyId === companyId);

      let alarmBy = 'Central de despacho';
      const guardAuthor = inc.guardLogEntries[0]?.author;
      if (guardAuthor) {
        alarmBy = `${guardAuthor.firstName} ${guardAuthor.lastName}`;
      } else if (inc.dispatchSource === DispatchSource.BOTONERA) {
        alarmBy = 'Central de Despachos';
      } else {
        const lead = inc.participants.find((p) =>
          ['COMANDANTE', 'CAPITAN'].includes(p.user.role),
        );
        if (lead) {
          alarmBy = `${lead.user.firstName} ${lead.user.lastName}`;
        } else if (inc.participants[0]) {
          alarmBy = `${inc.participants[0].user.firstName} ${inc.participants[0].user.lastName}`;
        }
      }

      const vehicles = companyVehicleRows.map((v) => ({
        patent: v.vehicle.patent,
        type: v.vehicle.type,
        brand: v.vehicle.brand,
      }));

      const hasFieldGps = inc.confirmedLatitude != null && inc.confirmedLongitude != null;
      const hasDispatchGps = inc.latitude != null && inc.longitude != null;
      const mapLat = hasFieldGps ? inc.confirmedLatitude! : inc.latitude ?? 0;
      const mapLng = hasFieldGps ? inc.confirmedLongitude! : inc.longitude ?? 0;

      return {
        id: inc.id,
        code: inc.code,
        type: inc.type,
        description: inc.description,
        address: inc.address,
        latitude: mapLat,
        longitude: mapLng,
        dispatchLatitude: hasDispatchGps ? inc.latitude : null,
        dispatchLongitude: hasDispatchGps ? inc.longitude : null,
        confirmedLatitude: hasFieldGps ? inc.confirmedLatitude : null,
        confirmedLongitude: hasFieldGps ? inc.confirmedLongitude : null,
        locationPinAt: inc.locationPinAt,
        hasCoordinates: hasFieldGps || hasDispatchGps,
        hasFieldGps,
        dispatchedAt: inc.dispatchedAt,
        closedAt: inc.closedAt,
        status: inc.closedAt ? 'CERRADA' : 'ACTIVA',
        alarmBy,
        dispatchSource: inc.dispatchSource,
        vehicles,
        involvedAsSupport: !isDispatchOwner,
        dispatchCompanyName: isDispatchOwner ? null : inc.company.name,
        dispatchCompanyNumber: isDispatchOwner ? null : inc.company.number,
        radioMessage: this.extractRadioMessage({
          description: inc.description,
          type: inc.type,
          address: inc.address,
          vehicles: companyVehicleRows,
        }),
        emergencyCodeId: this.parseEmergencyCodeId(inc.type),
        hasBitacora: !!inc.bitacoraEntry,
      };
    });
  }

  private parseEmergencyCodeId(incidentType: string): string | null {
    const head = incidentType.split(' — ')[0]?.trim();
    if (head && /^10(-\d+)+$/.test(head)) return head;
    return null;
  }

  private extractRadioMessage(inc: {
    description: string;
    type: string;
    address: string;
    vehicles: { vehicle: { patent: string; type: string } }[];
  }): string {
    const desc = inc.description?.trim() ?? '';
    if (/SECTOR/i.test(desc) && /CONCURRE/i.test(desc)) return desc;

    const codeId = this.parseEmergencyCodeId(inc.type);
    if (!codeId || !inc.address.trim() || !inc.vehicles.length) return desc;

    const codeSpoken = codeId.replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim();
    const sector = inc.address
      .split(',')
      .map((s) => s.trim())
      .filter((p) => p && !/provincia|región|region/i.test(p))[0]
      ?.toUpperCase() ?? inc.address.toUpperCase();

    const callsigns = inc.vehicles.map((v) => {
      const t = (v.vehicle.type ?? '').toLowerCase();
      let abbrev = 'C';
      if (t.includes('aérea') || t.includes('aerea')) abbrev = 'EA';
      else if (t.includes('escala')) abbrev = 'BR';
      else if (t.includes('bomba')) abbrev = 'AB';
      else if (t.includes('rescate')) abbrev = 'R';
      else if (t.includes('tanque')) abbrev = 'BT';
      const num = v.vehicle.patent.match(/(\d+)/)?.[1] ?? '';
      return num ? `${abbrev} ${num}` : abbrev;
    });

    const concurre =
      callsigns.length <= 1
        ? callsigns[0] ?? ''
        : `${callsigns.slice(0, -1).join(', ')} Y ${callsigns[callsigns.length - 1]}`;

    if (!concurre) return desc;
    return `${codeSpoken} SECTOR ${sector} CONCURRE ${concurre}`;
  }

  async getPublicBySlug(slug: string) {
    const company = await this.getCompanyBySlug(slug);
    const [roster, maquinistas, fleet, recentEmergencies] = await Promise.all([
      this.getRosterForCompany(company.id),
      this.getMaquinistasForCompany(company.id),
      this.getFleetForCompany(company.id),
      this.getRecentEmergencies(company.id, 8),
    ]);
    const status = this.mapPublicStatus(
      company.dispatchPublicEnabled,
      company.dispatchAvailable,
    );

    return {
      id: company.id,
      slug: company.dispatchSlug,
      name: company.name,
      number: company.number,
      region: company.region,
      city: company.city,
      address: company.address,
      phone: company.phone,
      email: company.email,
      logoUrl: company.logoUrl,
      headquartersImageUrl: company.headquartersImageUrl,
      publicEnabled: company.dispatchPublicEnabled,
      available: company.dispatchAvailable,
      status,
      roster,
      maquinistas,
      fleet,
      recentEmergencies,
      emergencyStats: {
        active: recentEmergencies.filter((e) => e.status === 'ACTIVA').length,
        total: recentEmergencies.length,
      },
    };
  }

  async toggleMaquinista(
    slug: string,
    userId: string,
    opts: { available?: boolean; principal?: boolean },
  ) {
    const company = await this.getCompanyBySlug(slug);

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId: company.id,
        isActive: true,
        isMaquinista: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Maquinista no pertenece a esta compañía');
    }

    if (opts.principal === true) {
      await this.prisma.user.updateMany({
        where: { companyId: company.id, maquinistaPrincipal: true },
        data: { maquinistaPrincipal: false },
      });
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          maquinistaPrincipal: true,
          maquinistaAvailable: true,
        },
      });
    } else if (opts.principal === false) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { maquinistaPrincipal: false },
      });
    }

    if (opts.available !== undefined) {
      const data: { maquinistaAvailable: boolean; maquinistaPrincipal?: boolean } = {
        maquinistaAvailable: opts.available,
      };
      if (!opts.available) {
        data.maquinistaPrincipal = false;
      }
      await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    }

    return this.getPublicBySlug(slug);
  }

  async toggleStationAvailability(
    slug: string,
    userId: string,
    available: boolean,
  ) {
    const company = await this.getCompanyBySlug(slug);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId: company.id, isActive: true },
    });
    if (!user) {
      throw new NotFoundException('Bombero no pertenece a esta compañía');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stationAvailable: available,
        stationAvailableAt: new Date(),
      },
    });

    return this.getPublicBySlug(slug);
  }

  async toggleStationAvailabilityByOperativeNumber(
    slug: string,
    operativeNumber: number,
    available?: boolean,
  ) {
    const company = await this.getCompanyBySlug(slug);

    const user = await this.prisma.user.findFirst({
      where: {
        companyId: company.id,
        isActive: true,
        operativeNumber,
      },
    });
    if (!user) {
      throw new NotFoundException(`No hay bombero con N° operativo ${operativeNumber} en esta compañía`);
    }

    const nextAvailable = available ?? !user.stationAvailable;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        stationAvailable: nextAvailable,
        stationAvailableAt: new Date(),
      },
    });

    return this.getPublicBySlug(slug);
  }

  async getConfig(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        number: true,
        city: true,
        dispatchSlug: true,
        dispatchPublicEnabled: true,
        dispatchAvailable: true,
      },
    });
    if (!company) throw new NotFoundException('Compañía no encontrada');
    const suggestedSlug =
      company.dispatchSlug ??
      slugify(`cia-${company.number}-${company.city}`);
    const roster = await this.getRosterForCompany(companyId);
    const maquinistas = await this.getMaquinistasForCompany(companyId);
    return {
      ...company,
      suggestedSlug,
      status: this.mapPublicStatus(
        company.dispatchPublicEnabled,
        company.dispatchAvailable,
      ),
      roster,
      maquinistas,
    };
  }

  async updateConfig(companyId: string, dto: UpdateDispatchCentralDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Compañía no encontrada');

    if (dto.dispatchSlug) {
      const taken = await this.prisma.company.findFirst({
        where: { dispatchSlug: dto.dispatchSlug, id: { not: companyId } },
      });
      if (taken) {
        throw new ConflictException('Ese slug ya está en uso por otra compañía');
      }
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        dispatchSlug: dto.dispatchSlug,
        dispatchPublicEnabled: dto.dispatchPublicEnabled,
        dispatchAvailable: dto.dispatchAvailable,
      },
      select: {
        id: true,
        name: true,
        number: true,
        city: true,
        dispatchSlug: true,
        dispatchPublicEnabled: true,
        dispatchAvailable: true,
      },
    });

    const roster = await this.getRosterForCompany(companyId);
    const maquinistas = await this.getMaquinistasForCompany(companyId);

    return {
      ...updated,
      status: this.mapPublicStatus(
        updated.dispatchPublicEnabled,
        updated.dispatchAvailable,
      ),
      roster,
      maquinistas,
    };
  }

  async ensureSlug(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Compañía no encontrada');
    if (company.dispatchSlug) return this.getConfig(companyId);

    let base = slugify(`cia-${company.number}-${company.city}`);
    let candidate = base;
    let i = 1;
    while (
      await this.prisma.company.findFirst({
        where: { dispatchSlug: candidate, id: { not: companyId } },
      })
    ) {
      candidate = `${base}-${i++}`;
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: { dispatchSlug: candidate },
    });
    return this.getConfig(companyId);
  }

  async getCuartelesOverview() {
    const companies = await this.prisma.company.findMany({
      where: { isActive: true },
      orderBy: { number: 'asc' },
      select: {
        id: true,
        number: true,
        name: true,
        city: true,
        address: true,
        logoUrl: true,
        dispatchSlug: true,
        dispatchPublicEnabled: true,
        dispatchAvailable: true,
      },
    });

    return Promise.all(
      companies.map(async (c) => {
        const [roster, maquinistas, fleet, activeEmergencies] = await Promise.all([
          this.getRosterForCompany(c.id),
          this.getMaquinistasForCompany(c.id),
          this.getFleetForCompany(c.id),
          this.prisma.incident.count({
            where: {
              ...this.incidentsInvolvingCompany(c.id),
              closedAt: null,
            },
          }),
        ]);
        return {
          ...c,
          status: this.mapPublicStatus(c.dispatchPublicEnabled, c.dispatchAvailable),
          roster: roster.stats,
          maquinistas: maquinistas.stats,
          fleet: fleet.stats,
          activeEmergencies,
        };
      }),
    );
  }

  async getGlobalDispatch() {
    const companies = await this.prisma.company.findMany({
      where: { isActive: true },
      orderBy: { number: 'asc' },
      select: {
        id: true,
        number: true,
        name: true,
        city: true,
        logoUrl: true,
        dispatchSlug: true,
      },
    });

    const mappedCompanies = await Promise.all(
      companies.map(async (c) => {
        const [roster, maquinistas, fleet] = await Promise.all([
          this.getRosterForCompany(c.id),
          this.getMaquinistasForCompany(c.id),
          this.getFleetForCompany(c.id),
        ]);
        return {
          ...c,
          roster,
          maquinistas,
          fleet,
        };
      })
    );

    const activeIncidents = await this.prisma.incident.findMany({
      where: { closedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyId: true,
        code: true,
        type: true,
        description: true,
        address: true,
        latitude: true,
        longitude: true,
        confirmedLatitude: true,
        confirmedLongitude: true,
        locationPinAt: true,
        dispatchedAt: true,
        closedAt: true,
        dispatchSource: true,
        company: { select: { number: true, name: true } },
        guardLogEntries: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: {
            author: { select: { firstName: true, lastName: true } },
          },
        },
        participants: {
          take: 5,
          select: {
            user: { select: { firstName: true, lastName: true, role: true } },
          },
        },
        vehicles: {
          select: {
            vehicle: {
              select: { id: true, patent: true, type: true, brand: true, companyId: true },
            },
          },
        },
        bitacoraEntry: { select: { id: true } },
      },
    });

    const activeEmergencies = this.mapIncidentsToPublic(activeIncidents, null);

    return {
      companies: mappedCompanies,
      activeEmergencies,
    };
  }
}
