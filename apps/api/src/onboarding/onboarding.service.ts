import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformLogService } from '../platform/platform-log.service';
import { ProvisionCuerpoDto } from './dto/provision-cuerpo.dto';
import { ImportUsersDto } from './dto/import-users.dto';
import { CreateCentralistasDto } from './dto/create-centralistas.dto';
import { AddCompanyDto } from './dto/add-company.dto';
import { mergeDuplicateCuerpos } from './dedupe-cuerpos';
import { PARRAL_COMPANIES, PARRAL_CUERPO } from './parral-cuerpo';
import { assignedRoles, normalizePhone, parseRoles, pickPrimaryRole, prismaHasRole } from '../common/user-roles';

const DEFAULT_PASSWORD = 'Demo1234!';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logs: PlatformLogService,
  ) {}

  async status() {
    await mergeDuplicateCuerpos(this.prisma as any);
    const [cuerpos, userCount, errorCount, centralistas] = await Promise.all([
      this.prisma.cuerpo.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          companies: {
            where: { isActive: true },
            orderBy: { number: 'asc' },
            include: {
              _count: { select: { users: true, vehicles: true } },
              users: { where: { isActive: true }, select: { role: true, roles: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.platformLog.count({
        where: {
          level: 'ERROR',
          createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      }),
      this.prisma.user.findMany({
        where: { isActive: true, ...prismaHasRole(Role.OPERADOR_CENTRAL) },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          rut: true,
          company: { select: { cuerpoId: true } },
        },
        orderBy: { lastName: 'asc' },
      }),
    ]);

    const companiesReady = cuerpos.flatMap((cuerpo) =>
      cuerpo.companies.map((company) => ({
        id: company.id,
        cuerpoId: cuerpo.id,
        cuerpoName: cuerpo.name,
        number: company.number,
        name: company.name,
        city: company.city,
        users: company._count.users,
        vehicles: company._count.vehicles,
        hasCapitan: company.users.some((u) => assignedRoles(u.role, u.roles).includes(Role.CAPITAN)),
        dispatchSlug: company.dispatchSlug,
        publicEnabled: company.dispatchPublicEnabled,
      })),
    );

    const byRole: Record<string, number> = {};
    const roleRows = await this.prisma.user.groupBy({
      by: ['role'],
      where: { isActive: true },
      _count: { role: true },
    });
    for (const row of roleRows) {
      byRole[row.role] = row._count.role;
    }

    return {
      cuerpos: cuerpos.length,
      companies: companiesReady.length,
      users: userCount,
      recentErrors: errorCount,
      byRole,
      hasComandante: (byRole.COMANDANTE ?? 0) > 0,
      hasOperadorCentral: (byRole.OPERADOR_CENTRAL ?? 0) > 0,
      bodies: cuerpos.map((cuerpo) => {
        const sala = centralistas.filter((u) => u.company?.cuerpoId === cuerpo.id);
        return {
          id: cuerpo.id,
          name: cuerpo.name,
          city: cuerpo.city,
          region: cuerpo.region,
          slug: cuerpo.slug,
          companies: cuerpo.companies.length,
          quartels: cuerpo.companies.map((company) => ({
            id: company.id,
            number: company.number,
            name: company.name,
            users: company._count.users,
            hasCapitan: company.users.some((u) => assignedRoles(u.role, u.roles).includes(Role.CAPITAN)),
          })),
          users: cuerpo.companies.reduce((sum, c) => sum + c._count.users, 0),
          ready: cuerpo.companies.filter((c) => c._count.users > 0 && c.users.some((u) => assignedRoles(u.role, u.roles).includes(Role.CAPITAN))).length,
          centralistas: sala.map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            rut: u.rut,
          })),
        };
      }),
      companiesReady,
    };
  }

  listLogs(level?: string) {
    return this.logs.list(120, level);
  }

  provisionParral(defaultPassword?: string) {
    return this.provisionCuerpo({
      city: PARRAL_CUERPO.city,
      region: PARRAL_CUERPO.region,
      bodyName: PARRAL_CUERPO.bodyName,
      phone: PARRAL_CUERPO.phone,
      enablePublicDispatch: true,
      createCommandStaff: false,
      defaultPassword: defaultPassword || DEFAULT_PASSWORD,
      companies: PARRAL_COMPANIES.map((company) => ({
        number: company.number,
        name: company.name,
        address: company.address,
        dispatchSlug: company.dispatchSlug,
      })),
    });
  }

  async findExistingCuerpo(city: string, bodyName: string) {
    const isParral = /parral/i.test(city) || /parral/i.test(bodyName);
    if (isParral) {
      const bySlug = await this.prisma.cuerpo.findUnique({ where: { slug: 'bomberos-parral' } });
      if (bySlug) return bySlug;
      const byCity = await this.prisma.cuerpo.findFirst({
        where: { isActive: true, city: { equals: 'Parral', mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
      });
      if (byCity) return byCity;
    }
    const slug = slugify(bodyName) || slugify(city);
    const bySlug = slug ? await this.prisma.cuerpo.findUnique({ where: { slug } }) : null;
    if (bySlug) return bySlug;
    return this.prisma.cuerpo.findFirst({
      where: {
        isActive: true,
        city: { equals: city, mode: 'insensitive' },
        name: { equals: bodyName, mode: 'insensitive' },
      },
    });
  }

  async provisionCuerpo(dto: ProvisionCuerpoDto) {
    await mergeDuplicateCuerpos(this.prisma as any);
    const password = dto.defaultPassword || DEFAULT_PASSWORD;
    const citySlug = slugify(dto.city) || 'cuerpo';
    const bodyName = dto.bodyName?.trim() || `Cuerpo de Bomberos de ${dto.city}`;
    const isParral = /parral/i.test(dto.city) || /parral/i.test(bodyName);
    const slug = isParral ? 'bomberos-parral' : (slugify(bodyName) || citySlug);

    let cuerpo = await this.findExistingCuerpo(dto.city, bodyName);
    if (!cuerpo) {
      cuerpo = await this.prisma.cuerpo.create({
        data: {
          name: bodyName,
          city: dto.city,
          region: dto.region,
          phone: dto.phone,
          slug,
        },
      });
      await this.logs.write({
        level: 'INFO',
        source: 'onboarding',
        message: `Cuerpo creado: ${bodyName}`,
        cuerpoId: cuerpo.id,
        detail: { city: dto.city, region: dto.region, companies: dto.companies.length },
      });
    } else if (!cuerpo.isActive) {
      cuerpo = await this.prisma.cuerpo.update({
        where: { id: cuerpo.id },
        data: { isActive: true, name: bodyName, city: dto.city, region: dto.region },
      });
    }

    const createdCompanies: Array<{ id: string; number: number; name: string; dispatchSlug: string | null }> = [];
    const skipped: string[] = [];
    const credentials: Array<{ role: string; email: string; password: string; company?: string }> = [];

    for (const row of dto.companies) {
      const exists = await this.prisma.company.findUnique({
        where: { cuerpoId_number: { cuerpoId: cuerpo.id, number: row.number } },
      });
      if (exists) {
        skipped.push(`${cuerpo.name}: ${row.number}ª ya existe (${exists.name})`);
        continue;
      }

      let dispatchSlug = row.dispatchSlug?.trim()
        || (row.number === 1 ? `bomberos-${citySlug}` : `${citySlug}-${row.number}`);
      const slugTaken = await this.prisma.company.findUnique({ where: { dispatchSlug } });
      if (slugTaken) dispatchSlug = `${citySlug}-${row.number}-${Date.now().toString(36)}`;

      const company = await this.prisma.company.create({
        data: {
          name: row.name,
          number: row.number,
          region: dto.region,
          city: dto.city,
          address: row.address?.trim() || `Cuartel ${row.number}ª — ${dto.city}`,
          phone: dto.phone,
          email: `${citySlug}-${row.number}@nodo360.net`,
          dispatchSlug,
          dispatchPublicEnabled: Boolean(dto.enablePublicDispatch),
          dispatchAvailable: true,
          cuerpoId: cuerpo.id,
        },
      });
      createdCompanies.push({
        id: company.id,
        number: company.number,
        name: company.name,
        dispatchSlug: company.dispatchSlug,
      });
    }

    if (dto.createCommandStaff) {
      const allCompanies = await this.prisma.company.findMany({
        where: { isActive: true, cuerpoId: cuerpo.id },
        orderBy: { number: 'asc' },
      });
      const first = allCompanies[0];
      if (!first) throw new BadRequestException('No hay compañías para asignar mandos');

      const hash = await bcrypt.hash(password, 10);
      const staff: Array<{
        role: Role;
        email: string;
        firstName: string;
        lastName: string;
        rut: string;
        companyId: string;
      }> = [
        {
          role: Role.COMANDANTE,
          email: `comandante.${citySlug}@nodo360.net`,
          firstName: 'Comandante',
          lastName: dto.city,
          rut: this.staffRut(90, 1),
          companyId: first.id,
        },
        {
          role: Role.OPERADOR_CENTRAL,
          email: `central.${citySlug}@nodo360.net`,
          firstName: 'Operador',
          lastName: 'Central',
          rut: this.staffRut(90, 2),
          companyId: first.id,
        },
      ];

      for (const company of allCompanies) {
        staff.push({
          role: Role.CAPITAN,
          email: `capitan.${company.number}.${citySlug}@nodo360.net`,
          firstName: 'Capitán',
          lastName: `${company.number}ª`,
          rut: this.staffRut(91, company.number),
          companyId: company.id,
        });
      }

      for (const person of staff) {
        const dup = await this.prisma.user.findFirst({
          where: { OR: [{ email: person.email }, { rut: person.rut }] },
        });
        if (dup) {
          skipped.push(`Ya existe ${person.email}`);
          continue;
        }
        await this.prisma.user.create({
          data: {
            ...person,
            roles: [person.role],
            passwordHash: hash,
            isActive: true,
          },
        });
        credentials.push({
          role: person.role,
          email: person.email,
          password,
          company: allCompanies.find((c) => c.id === person.companyId)?.name,
        });
      }
    }

    await this.logs.write({
      level: createdCompanies.length ? 'INFO' : 'WARN',
      source: 'onboarding',
      message: `${cuerpo.name}: ${createdCompanies.length} cuartel(es) nuevos, ${skipped.length} omitidos`,
      cuerpoId: cuerpo.id,
    });

    return {
      cuerpo: { id: cuerpo.id, name: cuerpo.name, slug: cuerpo.slug },
      bodyName: cuerpo.name,
      created: createdCompanies,
      skipped,
      credentials,
    };
  }

  async importUsers(dto: ImportUsersDto) {
    const password = dto.defaultPassword || DEFAULT_PASSWORD;
    const cuerpoId = dto.cuerpoId;
    if (!cuerpoId) {
      const count = await this.prisma.cuerpo.count({ where: { isActive: true } });
      if (count > 1) {
        throw new BadRequestException('Hay varios Cuerpos. Elegí a cuál cargar la nómina.');
      }
    }

    const companies = await this.prisma.company.findMany({
      where: { isActive: true, ...(cuerpoId ? { cuerpoId } : {}) },
    });
    const byNumber = new Map(companies.map((c) => [c.number, c]));
    const created: Array<{ email: string; role: string; company?: string }> = [];
    const skipped: string[] = [];

    for (const [index, row] of dto.users.entries()) {
      const email = row.email.trim().toLowerCase();
      const rut = row.rut.trim();
      const roles = parseRoles(row.role) as Role[];
      const role = pickPrimaryRole(roles) as Role;
      const company = row.companyNumber != null ? byNumber.get(row.companyNumber) : undefined;

      if (row.companyNumber != null && !company) {
        skipped.push(`Fila ${index + 1}: no existe compañía ${row.companyNumber}ª en este Cuerpo`);
        continue;
      }

      const dup = await this.prisma.user.findFirst({
        where: { OR: [{ email }, { rut }] },
      });
      if (dup) {
        skipped.push(`Fila ${index + 1}: ${email} / ${rut} ya existe`);
        continue;
      }

      if (row.operativeNumber != null && company) {
        const opDup = await this.prisma.user.findFirst({
          where: { companyId: company.id, operativeNumber: row.operativeNumber },
        });
        if (opDup) {
          skipped.push(`Fila ${index + 1}: N° ${row.operativeNumber} ya usado en ${company.number}ª`);
          continue;
        }
      }

      await this.prisma.user.create({
        data: {
          rut,
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email,
          phone: normalizePhone(row.phone),
          role,
          roles,
          companyId: company?.id,
          operativeNumber: row.operativeNumber,
          passwordHash: await bcrypt.hash(row.password || password, 10),
          isActive: true,
        },
      });
      created.push({ email, role, company: company?.name });
    }

    await this.logs.write({
      level: skipped.length && !created.length ? 'WARN' : 'INFO',
      source: 'onboarding',
      message: `Nómina: ${created.length} creados, ${skipped.length} omitidos`,
      cuerpoId: cuerpoId ?? companies[0]?.cuerpoId,
    });

    return { created, skipped, defaultPassword: password };
  }

  async createCentralistas(dto: CreateCentralistasDto) {
    const cuerpo = await this.prisma.cuerpo.findUnique({
      where: { id: dto.cuerpoId },
      include: {
        companies: { where: { isActive: true }, orderBy: { number: 'asc' } },
      },
    });
    if (!cuerpo) throw new BadRequestException('Cuerpo no encontrado');
    const home = cuerpo.companies[0];
    if (!home) throw new BadRequestException('El Cuerpo no tiene compañías. Creá los cuarteles primero.');

    const existing = await this.prisma.user.count({
      where: {
        isActive: true,
        ...prismaHasRole(Role.OPERADOR_CENTRAL),
        company: { cuerpoId: cuerpo.id },
      },
    });
    const incoming = dto.operators.length;
    if (existing + incoming > 6) {
      throw new BadRequestException(
        `Este Cuerpo ya tiene ${existing} centralista(s). Máximo 6. Podés cargar ${Math.max(0, 6 - existing)} más.`,
      );
    }

    const password = dto.defaultPassword || DEFAULT_PASSWORD;
    const created: Array<{ role: string; email: string; password: string; name: string }> = [];
    const skipped: string[] = [];

    for (const [index, row] of dto.operators.entries()) {
      const email = row.email.trim().toLowerCase();
      const rut = row.rut.trim();
      const firstName = row.firstName.trim();
      const lastName = row.lastName.trim();
      const hash = await bcrypt.hash(row.password || password, 10);

      const dup = await this.prisma.user.findFirst({
        where: { OR: [{ email }, { rut }] },
      });
      if (dup) {
        skipped.push(`Fila ${index + 1}: ${email} / ${rut} ya existe`);
        continue;
      }

      await this.prisma.user.create({
        data: {
          rut,
          firstName,
          lastName,
          email,
          role: Role.OPERADOR_CENTRAL,
          roles: [Role.OPERADOR_CENTRAL],
          companyId: home.id,
          passwordHash: hash,
          isActive: true,
        },
      });
      created.push({
        role: 'OPERADOR_CENTRAL',
        email,
        password: row.password || password,
        name: `${firstName} ${lastName}`,
      });
    }

    await this.logs.write({
      level: skipped.length && !created.length ? 'WARN' : 'INFO',
      source: 'onboarding',
      message: `${cuerpo.name}: ${created.length} centralista(s) para sala de radio`,
      cuerpoId: cuerpo.id,
    });

    return {
      cuerpo: { id: cuerpo.id, name: cuerpo.name },
      created,
      skipped,
      remaining: 6 - existing - created.length,
    };
  }

  async resetUserPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role === Role.KODESK) {
      throw new BadRequestException('Usuario no encontrado');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, isActive: true },
    });
    await this.logs.write({
      level: 'INFO',
      source: 'onboarding',
      message: `Clave restablecida: ${user.email}`,
      cuerpoId: user.companyId
        ? (await this.prisma.company.findUnique({ where: { id: user.companyId }, select: { cuerpoId: true } }))?.cuerpoId
        : undefined,
    });
    return { id: user.id, email: user.email, role: user.role, password };
  }

  async addCompany(cuerpoId: string, dto: AddCompanyDto) {
    const cuerpo = await this.prisma.cuerpo.findUnique({ where: { id: cuerpoId } });
    if (!cuerpo || !cuerpo.isActive) throw new BadRequestException('Cuerpo no encontrado');

    const exists = await this.prisma.company.findUnique({
      where: { cuerpoId_number: { cuerpoId, number: dto.number } },
    });
    if (exists?.isActive) {
      throw new BadRequestException(`Ya existe la ${dto.number}ª en ${cuerpo.name}`);
    }
    if (exists && !exists.isActive) {
      return this.prisma.company.update({
        where: { id: exists.id },
        data: {
          isActive: true,
          name: dto.name.trim(),
          address: dto.address?.trim() || exists.address,
        },
      });
    }

    const citySlug = slugify(cuerpo.city) || 'cuerpo';
    let dispatchSlug = dto.number === 1 ? `bomberos-${citySlug}` : `${citySlug}-${dto.number}`;
    const slugTaken = await this.prisma.company.findUnique({ where: { dispatchSlug } });
    if (slugTaken) dispatchSlug = `${citySlug}-${dto.number}-${Date.now().toString(36)}`;

    const company = await this.prisma.company.create({
      data: {
        name: dto.name.trim(),
        number: dto.number,
        region: cuerpo.region,
        city: cuerpo.city,
        address: dto.address?.trim() || `Cuartel ${dto.number}ª — ${cuerpo.city}`,
        dispatchSlug,
        dispatchPublicEnabled: true,
        dispatchAvailable: true,
        cuerpoId,
      },
    });
    await this.logs.write({
      level: 'INFO',
      source: 'onboarding',
      message: `${cuerpo.name}: agregada ${dto.number}ª ${dto.name}`,
      cuerpoId,
    });
    return company;
  }

  async deactivateCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { cuerpo: { select: { name: true } } },
    });
    if (!company) throw new BadRequestException('Compañía no encontrada');
    await this.prisma.company.update({ where: { id }, data: { isActive: false } });
    await this.logs.write({
      level: 'WARN',
      source: 'onboarding',
      message: `Compañía desactivada: ${company.number}ª ${company.name}`,
      cuerpoId: company.cuerpoId,
    });
    return { ok: true, id, name: company.name };
  }

  async deactivateCuerpo(id: string) {
    const cuerpo = await this.prisma.cuerpo.findUnique({ where: { id } });
    if (!cuerpo) throw new BadRequestException('Cuerpo no encontrado');
    await this.prisma.company.updateMany({ where: { cuerpoId: id }, data: { isActive: false } });
    await this.prisma.cuerpo.update({ where: { id }, data: { isActive: false } });
    await this.logs.write({
      level: 'WARN',
      source: 'onboarding',
      message: `Cuerpo desactivado: ${cuerpo.name}`,
      cuerpoId: id,
    });
    return { ok: true, id, name: cuerpo.name };
  }

  async dedupeCuerpos() {
    const merged = await mergeDuplicateCuerpos(this.prisma as any);
    await this.logs.write({
      level: merged ? 'INFO' : 'INFO',
      source: 'onboarding',
      message: merged ? `Se unificaron ${merged} Cuerpo(s) duplicado(s)` : 'No había Cuerpos duplicados',
    });
    return { merged };
  }

  async resetPlatform() {
    const snapshot = {
      cuerpos: await this.prisma.cuerpo.count(),
      companies: await this.prisma.company.count(),
      users: await this.prisma.user.count({ where: { role: { not: 'KODESK' } } }),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.vaccination.deleteMany();
      await tx.medication.deleteMany();
      await tx.allergy.deleteMany();
      await tx.medicalCondition.deleteMany();
      await tx.medicalExam.deleteMany();
      await tx.healthRecord.deleteMany();
      await tx.memberCertification.deleteMany();
      await tx.drill.deleteMany();
      await tx.evacuationRoute.deleteMany();
      await tx.meetingPoint.deleteMany();
      await tx.emergencyPlanVersion.deleteMany();
      await tx.emergencyPlanAttachment.deleteMany();
      await tx.socialContribution.deleteMany();
      await tx.membershipFee.deleteMany();
      await tx.memberProfile.deleteMany();
      await tx.guardLogEntry.deleteMany();
      await tx.guardHandover.deleteMany();
      await tx.guardLog.deleteMany();
      await tx.alarmDeliveryHistory.deleteMany();
      await tx.alarmDelivery.deleteMany();
      await tx.alarmNotification.deleteMany();
      await tx.devicePushToken.deleteMany();
      await tx.incidentTimelineEvent.deleteMany();
      await tx.incidentEmergencyResponseHistory.deleteMany();
      await tx.incidentEmergencyResponse.deleteMany();
      await tx.incidentParticipant.deleteMany();
      await tx.incidentVehicle.deleteMany();
      await tx.emergencyBitacoraEntry.deleteMany();
      await tx.incident.deleteMany();
      await tx.emergencyPlan.deleteMany();
      await tx.maintenance.deleteMany();
      await tx.fleetLog.deleteMany();
      await tx.inventoryAuditItem.deleteMany();
      await tx.inventoryAudit.deleteMany();
      await tx.shift.deleteMany();
      await tx.invoice.deleteMany();
      await tx.purchase.deleteMany();
      await tx.budget.deleteMany();
      await tx.document.deleteMany();
      await tx.equipment.deleteMany();
      await tx.vehicle.deleteMany();
      await tx.hydrant.deleteMany();
      await tx.announcement.deleteMany();
      await tx.userAchievement.deleteMany();
      await tx.user.deleteMany({ where: { role: { not: 'KODESK' } } });
      await tx.user.updateMany({
        where: { role: 'KODESK' },
        data: { companyId: null, supportCompanyId: null },
      });
      await tx.platformLog.deleteMany();
      await tx.company.deleteMany();
      await tx.cuerpo.deleteMany();
    });

    await this.logs.write({
      level: 'WARN',
      source: 'onboarding',
      message: `Reset completo: ${snapshot.cuerpos} cuerpos, ${snapshot.companies} compañías, ${snapshot.users} usuarios`,
      detail: snapshot,
    });

    return {
      ok: true,
      deleted: snapshot,
      kept: 'Usuario Kodesk intacto',
    };
  }

  private staffRut(prefix: number, n: number) {
    return `${prefix}.${String(n).padStart(3, '0')}.000-K`;
  }
}
