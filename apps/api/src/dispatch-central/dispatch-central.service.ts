import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { EquipmentStatus, FleetLogType, DispatchSource, IncidentStatus, EmergencyResponseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StandbyAlertService } from './standby-alert.service';
import { UpdateDispatchCentralDto } from './dto/update-dispatch-central.dto';
import { Actor, assertCompanyAccess, companyIdsForActor } from '../common/cuerpo-scope';
import { assignedRoles } from '../common/user-roles';
import {
  HeaderRequest,
  SALA_TOKEN_EXPIRES_SEC,
  bearerFromRequest,
  readSalaToken,
  salaTokenFromRequest,
  signSalaToken,
} from '../common/sala-token';

export type DispatchPublicStatus = 'DISPONIBLE' | 'NO_DISPONIBLE' | 'OCULTA';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMANDANTE: 'Comandante',
  CAPITAN: 'Capitán',
  OPERADOR_CENTRAL: 'Centralista',
  ENCARGADO_MATERIAL: 'Enc. Material',
  TESORERO: 'Tesorero',
  SECRETARIO: 'Secretario',
  BOMBERO: 'Bombero Operativo',
  BOMBERO_HONORARIO: 'Bombero Honorario',
  BOMBERO_INICIAL: 'Bombero Inicial',
  BOMBERO_PROFESIONAL: 'Bombero Profesional',
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
  B: 250,
  'BF / F': 200,
  BF: 200,
  F: 200,
  Q: 300,
  R: 80,
  S: 40,
  Z: 8000,
  H: 150,
  'K / J': 60,
  K: 60,
  J: 60,
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

type PublicSalaAccess = 'sala' | 'user' | 'open' | 'locked';

const UNLOCK_MAX_FAILS = 8;
const UNLOCK_BLOCK_MS = 5 * 60 * 1000;

@Injectable()
export class DispatchCentralService {
  private unlockAttempts = new Map<string, { fails: number; blockedUntil: number }>();

  constructor(
    private prisma: PrismaService,
    private standbyAlerts: StandbyAlertService,
    private jwt: JwtService,
  ) {}

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
    roles?: string[];
    phone?: string | null;
    photoUrl: string | null;
    stationAvailable: boolean;
    stationAvailableAt: Date | null;
    operativeNumber: number | null;
    companyId?: string | null;
    supportCompanyId?: string | null;
    isMaquinista?: boolean;
    maquinistaAvailable?: boolean;
    maquinistaPrincipal?: boolean;
  }) {
    const roles = user.roles?.length ? user.roles : [user.role];
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
      roles,
      phone: user.phone ?? null,
      roleLabel: roles.map((role) => ROLE_LABELS[role] ?? role).join(' · '),
      photoUrl: user.photoUrl,
      stationAvailable: user.stationAvailable,
      stationAvailableAt: user.stationAvailableAt,
      operativeNumber: user.operativeNumber,
      companyId: user.companyId,
      supportCompanyId: user.supportCompanyId,
      isMaquinista: user.isMaquinista ?? false,
      maquinistaAvailable: user.maquinistaAvailable ?? false,
      maquinistaPrincipal: user.maquinistaPrincipal ?? false,
    };
  }

  private estimateFuelLevel(
    vehicleType: string,
    latestFuel: { fuelLiters: number | null; fullTank: boolean } | undefined,
  ): number | null {
    if (!latestFuel) return null;
    const capacity =
      TANK_CAPACITY_L[vehicleType] ??
      TANK_CAPACITY_L[this.vehicleTypeAbbrev(vehicleType)] ??
      200;
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
    operativeNumber?: number | null;
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
      operativeNumber: user.operativeNumber ?? null,
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
        operativeNumber: true,
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

  async getRosterForCompany(companyId: string, actor?: Actor) {
    if (actor) await assertCompanyAccess(this.prisma, actor, companyId);
    const members = await this.prisma.user.findMany({
      where: {
        OR: [
          { companyId },
          { supportCompanyId: companyId },
        ],
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        roles: true,
        phone: true,
        photoUrl: true,
        stationAvailable: true,
        stationAvailableAt: true,
        operativeNumber: true,
        companyId: true,
        supportCompanyId: true,
        isMaquinista: true,
        maquinistaAvailable: true,
        maquinistaPrincipal: true,
        supportCompany: {
          select: { name: true }
        }
      },
      orderBy: [
        { stationAvailable: 'desc' },
        { operativeNumber: 'asc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    const mapped = members.map((m) => {
      const isSupportingOther = m.companyId === companyId && m.supportCompanyId && m.supportCompanyId !== companyId;
      const baseMapped = this.mapMember(m);
      
      return {
        ...baseMapped,
        // If they are supporting another company, they are NOT available here
        stationAvailable: isSupportingOther ? false : baseMapped.stationAvailable,
        // Send the support company name if they are supporting another company
        supportCompanyName: isSupportingOther ? m.supportCompany?.name : null,
      };
    });
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
              { status: { in: [IncidentStatus.ACTIVE, IncidentStatus.ARRIVED] } },
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
        status: true,
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
          select: {
            author: { select: { firstName: true, lastName: true } },
          },
        },
        participants: {
          take: 40,
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                photoUrl: true,
                operativeNumber: true,
                isMaquinista: true,
              },
            },
          },
        },
        emergencyResponses: {
          where: {
            status: {
              in: [
                EmergencyResponseStatus.GOING,
                EmergencyResponseStatus.ON_SCENE,
                EmergencyResponseStatus.LOCATION_MARKED,
              ],
            },
          },
          select: {
            status: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                photoUrl: true,
                operativeNumber: true,
                isMaquinista: true,
              },
            },
          },
        },
        vehicles: {
          select: {
            vehicle: {
              select: {
                id: true,
                patent: true,
                type: true,
                brand: true,
                model: true,
                imageUrl: true,
                companyId: true,
              },
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
      const guardAuthor = inc.guardLogEntries?.author;
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
        id: v.vehicle.id,
        patent: v.vehicle.patent,
        type: v.vehicle.type,
        brand: v.vehicle.brand,
        model: v.vehicle.model,
        imageUrl: v.vehicle.imageUrl,
      }));

      const mapCrew = (user: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
        photoUrl: string | null;
        operativeNumber: number | null;
        isMaquinista?: boolean;
      }, status?: string | null) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role] ?? user.role,
        photoUrl: user.photoUrl,
        operativeNumber: user.operativeNumber,
        isMaquinista: user.isMaquinista ?? false,
        status: status ?? null,
      });

      const crewById = new Map<string, ReturnType<typeof mapCrew>>();
      for (const p of inc.participants ?? []) {
        if (p.user) crewById.set(p.user.id, mapCrew(p.user));
      }
      for (const r of inc.emergencyResponses ?? []) {
        if (!r.user) continue;
        crewById.set(r.user.id, mapCrew(r.user, r.status));
      }

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
        companyId: inc.companyId,
        company: inc.company
          ? { number: inc.company.number, name: inc.company.name }
          : undefined,
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
        operationalStatus: inc.status,
        status:
          inc.status === 'CANCELLED'
            ? 'CANCELADA'
            : inc.status === 'CLOSED'
              ? 'CERRADA'
              : 'ACTIVA',
        alarmBy,
        dispatchSource: inc.dispatchSource,
        vehicles,
        crew: [...crewById.values()],
        participants: [...crewById.values()].map((p) => ({
          name: p.name,
          role: p.role,
          firstName: p.firstName,
          lastName: p.lastName,
        })),
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
    const head = incidentType.split(' — ')[0]?.trim() ?? '';
    if (/^10(-\d+)+\s+por\s+10(-\d+)+$/i.test(head)) return head;
    if (/^10-\d+x10-\d+$/i.test(head)) {
      const [left, right] = head.split(/x/i);
      return `${left} por ${right}`;
    }
    if (/^10(-\d+)+$/.test(head)) return head;
    return null;
  }

  private vehicleTypeAbbrev(type?: string): string {
    if (!type) return 'B';
    const raw = type.trim();
    if (raw === 'B' || raw === 'Q' || raw === 'R' || raw === 'S' || raw === 'Z' || raw === 'H') {
      return raw;
    }
    if (raw.startsWith('BF')) return 'BF';
    if (raw.startsWith('K')) return 'K';
    const coded = raw.match(/^(BF|RX|B|F|Q|R|S|Z|H|K|J)\b/i);
    if (coded) return coded[1].toUpperCase();
    const t = raw.toLowerCase();
    if (t.includes('forestal') || t.includes('pastizal')) return 'BF';
    if (t.includes('haz') || t.includes('peligro')) return 'H';
    if (t.includes('aljibe') || t.includes('cisterna') || t.includes('tanque')) return 'Z';
    if (t.includes('ambul')) return 'S';
    if (t.includes('rescate')) return 'R';
    if (t.includes('escala') || t.includes('aére') || t.includes('aere') || t.includes('altura')) return 'Q';
    if (t.includes('comando') || t.includes('transporte') || t.includes('liviano') || t.includes('utilitario')) return 'K';
    if (t.includes('bomba')) return 'B';
    return raw.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'B';
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
      const abbrev = this.vehicleTypeAbbrev(v.vehicle.type);
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

  private assertUnlockAllowed(slug: string) {
    const row = this.unlockAttempts.get(slug);
    if (row && row.blockedUntil > Date.now()) {
      throw new UnauthorizedException('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
    }
  }

  private recordUnlockFail(slug: string) {
    const prev = this.unlockAttempts.get(slug);
    const fails = (prev?.fails ?? 0) + 1;
    this.unlockAttempts.set(slug, {
      fails,
      blockedUntil: fails >= UNLOCK_MAX_FAILS ? Date.now() + UNLOCK_BLOCK_MS : 0,
    });
  }

  private clearUnlockFails(slug: string) {
    this.unlockAttempts.delete(slug);
  }

  private async actorFromBearer(token: string): Promise<Actor | null> {
    const sala = readSalaToken(this.jwt, token);
    if (sala) return null;
    try {
      const payload = this.jwt.verify<{ typ?: string; sub?: string }>(token);
      if (payload.typ === 'sala' || !payload.sub) return null;
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          role: true,
          roles: true,
          isActive: true,
          companyId: true,
          company: { select: { cuerpoId: true } },
        },
      });
      if (!user?.isActive) return null;
      return {
        id: user.id,
        role: user.role,
        roles: assignedRoles(user.role, user.roles),
        companyId: user.companyId,
        cuerpoId: user.company?.cuerpoId ?? null,
      };
    } catch {
      return null;
    }
  }

  async peekPublicAccess(slug: string, req: HeaderRequest): Promise<PublicSalaAccess> {
    const company = await this.getCompanyBySlug(slug);
    const sala = readSalaToken(this.jwt, salaTokenFromRequest(req));
    if (sala && sala.slug === slug && sala.companyId === company.id) return 'sala';

    const bearer = bearerFromRequest(req);
    const actor = bearer ? await this.actorFromBearer(bearer) : null;
    if (actor) {
      await assertCompanyAccess(this.prisma, actor, company.id);
      return 'user';
    }

    if (!company.dispatchPinHash) return 'open';
    return 'locked';
  }

  async assertPublicSalaAccess(slug: string, req: HeaderRequest) {
    const access = await this.peekPublicAccess(slug, req);
    if (access === 'locked') {
      throw new UnauthorizedException('PIN de sala requerido');
    }
    return access;
  }

  async getPublicLocked(slug: string) {
    const company = await this.getCompanyBySlug(slug);
    return {
      locked: true as const,
      hasPin: Boolean(company.dispatchPinHash),
      slug: company.dispatchSlug,
      name: company.name,
      number: company.number,
      city: company.city,
      logoUrl: company.logoUrl,
      publicEnabled: company.dispatchPublicEnabled,
    };
  }

  async unlockPublic(slug: string, pin: string) {
    const company = await this.getCompanyBySlug(slug);
    if (!company.dispatchPinHash) {
      throw new BadRequestException('Esta sala aún no tiene PIN. Configúralo en Despacho360.');
    }
    this.assertUnlockAllowed(slug);
    const ok = await bcrypt.compare(pin, company.dispatchPinHash);
    if (!ok) {
      this.recordUnlockFail(slug);
      throw new UnauthorizedException('PIN incorrecto');
    }
    this.clearUnlockFails(slug);
    return {
      token: signSalaToken(this.jwt, company.id, slug),
      expiresIn: SALA_TOKEN_EXPIRES_SEC,
    };
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
      standby: this.standbyAlerts.peek(company.id),
    };
  }

  async triggerStandby(companyId: string, message?: string, actor?: Actor) {
    if (actor) await assertCompanyAccess(this.prisma, actor, companyId);
    return this.standbyAlerts.trigger(companyId, message);
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
      },
    });
    if (!user) {
      throw new NotFoundException('Bombero no pertenece a esta compañía');
    }

    if (opts.principal === true) {
      await this.prisma.user.updateMany({
        where: { companyId: company.id, maquinistaPrincipal: true },
        data: { maquinistaPrincipal: false },
      });
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isMaquinista: true,
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
      const data: {
        isMaquinista?: boolean;
        maquinistaAvailable: boolean;
        maquinistaPrincipal?: boolean;
      } = {
        maquinistaAvailable: opts.available,
      };
      if (opts.available) {
        data.isMaquinista = true;
      } else {
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
      where: { 
        id: userId, 
        isActive: true,
        OR: [
          { companyId: company.id },
          { supportCompanyId: company.id }
        ]
      },
    });
    if (!user) {
      throw new NotFoundException('Bombero no pertenece a esta compañía');
    }

    let nextSupportCompanyId = user.supportCompanyId;
    if (user.companyId === company.id) {
       nextSupportCompanyId = null;
    } else if (user.supportCompanyId === company.id && !available) {
       nextSupportCompanyId = null;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stationAvailable: available,
        stationAvailableAt: available ? new Date() : null,
        supportCompanyId: nextSupportCompanyId,
      },
    });

    return this.getPublicBySlug(slug);
  }

  async toggleMyStationAvailability(userId: string, available: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, companyId: true },
    });
    if (!user?.isActive) throw new NotFoundException('Usuario no encontrado');
    if (!user.companyId) {
      throw new ForbiddenException('Usuario sin compañía asignada');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        stationAvailable: available,
        stationAvailableAt: available ? new Date() : null,
        supportCompanyId: null,
      },
      select: {
        stationAvailable: true,
        stationAvailableAt: true,
        company: { select: { id: true, name: true, number: true, dispatchSlug: true } },
      },
    });

    return {
      stationAvailable: updated.stationAvailable,
      stationAvailableAt: updated.stationAvailableAt,
      company: updated.company,
    };
  }

  async toggleMyMaquinistaAvailability(userId: string, available: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, companyId: true },
    });
    if (!user?.isActive) throw new NotFoundException('Usuario no encontrado');
    if (!user.companyId) {
      throw new ForbiddenException('Usuario sin compañía asignada');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: available
        ? { isMaquinista: true, maquinistaAvailable: true }
        : { maquinistaAvailable: false, maquinistaPrincipal: false },
      select: {
        isMaquinista: true,
        maquinistaAvailable: true,
        maquinistaPrincipal: true,
      },
    });

    return updated;
  }

  async searchOperativeGlobally(slug: string, operativeNumber: number) {
    if (!operativeNumber || isNaN(operativeNumber)) return null;
    const company = await this.getCompanyBySlug(slug);
    const user = await this.prisma.user.findFirst({
      where: {
        operativeNumber,
        isActive: true,
        company: { cuerpoId: company.cuerpoId },
      },
      include: { company: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      roleLabel: user.company?.name ? `Compañía: ${user.company.name}` : 'Bombero',
      photoUrl: user.photoUrl,
      operativeNumber: user.operativeNumber,
      stationAvailable: user.stationAvailable,
      companyId: user.companyId,
    };
  }

  async toggleStationAvailabilityByOperativeNumber(
    slug: string,
    operativeNumber: number,
    available?: boolean,
  ) {
    const company = await this.getCompanyBySlug(slug);

    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        operativeNumber,
        company: { cuerpoId: company.cuerpoId },
      },
    });
    if (!user) {
      throw new NotFoundException(`No hay bombero con N° operativo ${operativeNumber}`);
    }

    const nextAvailable = available ?? !user.stationAvailable;
    
    let supportCompanyId = user.supportCompanyId;
    if (user.companyId !== company.id) {
      if (nextAvailable) {
        supportCompanyId = company.id;
      } else {
        supportCompanyId = null;
      }
    } else {
      supportCompanyId = null;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        stationAvailable: nextAvailable,
        stationAvailableAt: new Date(),
        supportCompanyId,
      },
    });

    return this.getPublicBySlug(slug);
  }

  async getConfig(companyId: string, actor?: Actor) {
    if (actor) await assertCompanyAccess(this.prisma, actor, companyId);
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
        dispatchPinHash: true,
      },
    });
    if (!company) throw new NotFoundException('Compañía no encontrada');
    const { dispatchPinHash, ...rest } = company;
    const suggestedSlug =
      rest.dispatchSlug ??
      slugify(`cia-${rest.number}-${rest.city}`);
    const roster = await this.getRosterForCompany(companyId);
    const maquinistas = await this.getMaquinistasForCompany(companyId);
    return {
      ...rest,
      hasPin: Boolean(dispatchPinHash),
      suggestedSlug,
      status: this.mapPublicStatus(
        company.dispatchPublicEnabled,
        company.dispatchAvailable,
      ),
      roster,
      maquinistas,
    };
  }

  async updateConfig(companyId: string, dto: UpdateDispatchCentralDto, actor?: Actor) {
    if (actor) await assertCompanyAccess(this.prisma, actor, companyId);
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

    const enablingPublic = dto.dispatchPublicEnabled === true;
    const willHavePin = Boolean(dto.dispatchPin) || Boolean(company.dispatchPinHash);
    if (enablingPublic && !willHavePin) {
      throw new BadRequestException('Definí un PIN de 4 a 8 dígitos para la sala de máquinas');
    }

    const nextPinHash = dto.dispatchPin
      ? await bcrypt.hash(dto.dispatchPin, 10)
      : undefined;

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        dispatchSlug: dto.dispatchSlug,
        dispatchPublicEnabled: dto.dispatchPublicEnabled,
        dispatchAvailable: dto.dispatchAvailable,
        ...(nextPinHash ? { dispatchPinHash: nextPinHash } : {}),
      },
      select: {
        id: true,
        name: true,
        number: true,
        city: true,
        dispatchSlug: true,
        dispatchPublicEnabled: true,
        dispatchAvailable: true,
        dispatchPinHash: true,
      },
    });

    const roster = await this.getRosterForCompany(companyId);
    const maquinistas = await this.getMaquinistasForCompany(companyId);
    const { dispatchPinHash, ...rest } = updated;

    return {
      ...rest,
      hasPin: Boolean(dispatchPinHash),
      status: this.mapPublicStatus(
        updated.dispatchPublicEnabled,
        updated.dispatchAvailable,
      ),
      roster,
      maquinistas,
    };
  }

  async ensureSlug(companyId: string, actor?: Actor) {
    if (actor) await assertCompanyAccess(this.prisma, actor, companyId);
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

  async getCuartelesOverview(actor?: Actor) {
    const ids = actor ? await companyIdsForActor(this.prisma, actor) : null;
    const companies = await this.prisma.company.findMany({
      where: { isActive: true, ...(ids ? { id: { in: ids } } : {}) },
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
              status: { in: [IncidentStatus.ACTIVE, IncidentStatus.ARRIVED] },
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

  async getGlobalDispatch(actor?: Actor) {
    const ids = actor ? await companyIdsForActor(this.prisma, actor) : null;
    const companies = await this.prisma.company.findMany({
      where: { isActive: true, ...(ids ? { id: { in: ids } } : {}) },
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
      where: {
        status: { in: [IncidentStatus.ACTIVE, IncidentStatus.ARRIVED] },
        ...(ids ? { companyId: { in: ids } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyId: true,
        status: true,
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
          select: {
            author: { select: { firstName: true, lastName: true } },
          },
        },
        participants: {
          take: 40,
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                photoUrl: true,
                operativeNumber: true,
                isMaquinista: true,
              },
            },
          },
        },
        emergencyResponses: {
          where: {
            status: {
              in: [
                EmergencyResponseStatus.GOING,
                EmergencyResponseStatus.ON_SCENE,
                EmergencyResponseStatus.LOCATION_MARKED,
              ],
            },
          },
          select: {
            status: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                photoUrl: true,
                operativeNumber: true,
                isMaquinista: true,
              },
            },
          },
        },
        vehicles: {
          select: {
            vehicle: {
              select: {
                id: true,
                patent: true,
                type: true,
                brand: true,
                model: true,
                imageUrl: true,
                companyId: true,
              },
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
