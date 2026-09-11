import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProvisionCuerpoDto } from './dto/provision-cuerpo.dto';
import { ImportUsersDto } from './dto/import-users.dto';

const DEFAULT_PASSWORD = 'Demo1234!';

const ROLE_ALIASES: Record<string, Role> = {
  COMANDANTE: Role.COMANDANTE,
  CDTE: Role.COMANDANTE,
  CAPITAN: Role.CAPITAN,
  CAPITÁN: Role.CAPITAN,
  OPERADOR_CENTRAL: Role.OPERADOR_CENTRAL,
  CENTRAL: Role.OPERADOR_CENTRAL,
  ENCARGADO_MATERIAL: Role.ENCARGADO_MATERIAL,
  MATERIAL: Role.ENCARGADO_MATERIAL,
  SECRETARIO: Role.SECRETARIO,
  TESORERO: Role.TESORERO,
  BOMBERO: Role.BOMBERO,
  BOMBERO_HONORARIO: Role.BOMBERO_HONORARIO,
  HONORARIO: Role.BOMBERO_HONORARIO,
  BOMBERO_INICIAL: Role.BOMBERO_INICIAL,
  INICIAL: Role.BOMBERO_INICIAL,
  BOMBERO_PROFESIONAL: Role.BOMBERO_PROFESIONAL,
  PROFESIONAL: Role.BOMBERO_PROFESIONAL,
  AUDITOR: Role.AUDITOR,
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function parseRole(raw?: string): Role {
  if (!raw) return Role.BOMBERO;
  const key = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (key === 'KODESK') return Role.BOMBERO;
  return ROLE_ALIASES[key] ?? Role.BOMBERO;
}

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async status() {
    const [companies, users] = await Promise.all([
      this.prisma.company.findMany({
        where: { isActive: true },
        orderBy: { number: 'asc' },
        include: {
          _count: { select: { users: true, vehicles: true } },
          users: { where: { isActive: true }, select: { role: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { isActive: true },
        select: { role: true },
      }),
    ]);

    const byRole: Record<string, number> = {};
    for (const user of users) {
      byRole[user.role] = (byRole[user.role] ?? 0) + 1;
    }

    return {
      companies: companies.length,
      users: users.length,
      byRole,
      hasComandante: (byRole.COMANDANTE ?? 0) > 0,
      hasOperadorCentral: (byRole.OPERADOR_CENTRAL ?? 0) > 0,
      companiesReady: companies.map((company) => ({
        id: company.id,
        number: company.number,
        name: company.name,
        city: company.city,
        users: company._count.users,
        vehicles: company._count.vehicles,
        hasCapitan: company.users.some((u) => u.role === Role.CAPITAN),
        dispatchSlug: company.dispatchSlug,
        publicEnabled: company.dispatchPublicEnabled,
      })),
    };
  }

  async provisionCuerpo(dto: ProvisionCuerpoDto) {
    const password = dto.defaultPassword || DEFAULT_PASSWORD;
    const citySlug = slugify(dto.city) || 'cuerpo';
    const createdCompanies: Array<{ id: string; number: number; name: string; dispatchSlug: string | null }> = [];
    const skipped: string[] = [];
    const credentials: Array<{ role: string; email: string; password: string; company?: string }> = [];

    for (const row of dto.companies) {
      const exists = await this.prisma.company.findUnique({ where: { number: row.number } });
      if (exists) {
        skipped.push(`Compañía ${row.number}ª ya existe (${exists.name})`);
        continue;
      }

      let dispatchSlug = row.number === 1 ? `bomberos-${citySlug}` : `${citySlug}-${row.number}`;
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
        where: { isActive: true },
        orderBy: { number: 'asc' },
      });
      const first = allCompanies[0];
      if (!first) throw new BadRequestException('No hay compañías para asignar mandos');

      const hash = await bcrypt.hash(password, 10);
      const staff = [
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

    return {
      bodyName: dto.bodyName || `Cuerpo de Bomberos de ${dto.city}`,
      created: createdCompanies,
      skipped,
      credentials,
    };
  }

  async importUsers(dto: ImportUsersDto) {
    const password = dto.defaultPassword || DEFAULT_PASSWORD;
    const companies = await this.prisma.company.findMany({ where: { isActive: true } });
    const byNumber = new Map(companies.map((c) => [c.number, c]));
    const created: Array<{ email: string; role: string; company?: string }> = [];
    const skipped: string[] = [];

    for (const [index, row] of dto.users.entries()) {
      const email = row.email.trim().toLowerCase();
      const rut = row.rut.trim();
      const role = parseRole(row.role);
      const company = row.companyNumber != null ? byNumber.get(row.companyNumber) : undefined;

      if (row.companyNumber != null && !company) {
        skipped.push(`Fila ${index + 1}: no existe compañía ${row.companyNumber}ª`);
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
          role,
          companyId: company?.id,
          operativeNumber: row.operativeNumber,
          passwordHash: await bcrypt.hash(row.password || password, 10),
          isActive: true,
        },
      });
      created.push({ email, role, company: company?.name });
    }

    return { created, skipped, defaultPassword: password };
  }

  private staffRut(prefix: number, n: number) {
    return `${prefix}.${String(n).padStart(3, '0')}.000-K`;
  }
}
