import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';

const SOON_DAYS = 30;

export type CertStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'SIN_VENCIMIENTO';

function computeStatus(expiresAt: Date | null | undefined): CertStatus {
  if (!expiresAt) return 'SIN_VENCIMIENTO';
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);
  if (days < 0) return 'VENCIDO';
  if (days <= SOON_DAYS) return 'POR_VENCER';
  return 'VIGENTE';
}

function enrich<T extends { expiresAt: Date | null }>(row: T) {
  return {
    ...row,
    status: computeStatus(row.expiresAt),
    daysUntilExpiry: row.expiresAt
      ? Math.ceil((row.expiresAt.getTime() - Date.now()) / 86400000)
      : null,
  };
}

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}

  async getSummary(companyId?: string) {
    const where = companyId ? { companyId } : {};
    const rows = await this.prisma.memberCertification.findMany({
      where,
      select: { expiresAt: true, category: true },
    });

    let vigente = 0;
    let porVencer = 0;
    let vencido = 0;
    let sinVencimiento = 0;
    const byCategory: Record<string, number> = {};

    for (const r of rows) {
      const st = computeStatus(r.expiresAt);
      if (st === 'VIGENTE') vigente++;
      else if (st === 'POR_VENCER') porVencer++;
      else if (st === 'VENCIDO') vencido++;
      else sinVencimiento++;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    }

    return {
      total: rows.length,
      vigente,
      porVencer,
      vencido,
      sinVencimiento,
      byCategory,
      soonDays: SOON_DAYS,
    };
  }

  async findExpiring(companyId?: string, days = SOON_DAYS) {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + days);

    const rows = await this.prisma.memberCertification.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        expiresAt: { not: null, lte: horizon },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, rut: true, email: true } },
        company: { select: { id: true, name: true, number: true } },
      },
      orderBy: { expiresAt: 'asc' },
    });

    const expired = rows.filter(r => computeStatus(r.expiresAt) === 'VENCIDO').map(enrich);
    const soon = rows.filter(r => computeStatus(r.expiresAt) === 'POR_VENCER').map(enrich);

    return { expired, soon, soonDays: days };
  }

  findAll(filters?: {
    companyId?: string;
    userId?: string;
    category?: string;
    status?: CertStatus;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.category) where.category = filters.category;

    return this.prisma.memberCertification
      .findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, rut: true, email: true, role: true } },
          company: { select: { id: true, name: true, number: true } },
        },
        orderBy: [{ expiresAt: 'asc' }, { name: 'asc' }],
      })
      .then(rows => {
        const enriched = rows.map(enrich);
        if (!filters?.status) return enriched;
        return enriched.filter(r => r.status === filters.status);
      });
  }

  async findOne(id: string) {
    const row = await this.prisma.memberCertification.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, rut: true, email: true, role: true } },
        company: true,
      },
    });
    if (!row) throw new NotFoundException('Certificación no encontrada');
    return enrich(row);
  }

  create(dto: CreateCertificationDto) {
    return this.prisma.memberCertification
      .create({
        data: {
          name: dto.name,
          category: dto.category ?? 'OTRO',
          issuer: dto.issuer,
          issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          documentUrl: dto.documentUrl,
          notes: dto.notes,
          userId: dto.userId,
          companyId: dto.companyId,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, rut: true } },
          company: { select: { id: true, name: true, number: true } },
        },
      })
      .then(enrich);
  }

  async update(id: string, dto: UpdateCertificationDto) {
    await this.findOne(id);
    return this.prisma.memberCertification
      .update({
        where: { id },
        data: {
          ...dto,
          issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : dto.issuedAt === null ? null : undefined,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : dto.expiresAt === null ? null : undefined,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, rut: true } },
          company: { select: { id: true, name: true, number: true } },
        },
      })
      .then(enrich);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.memberCertification.delete({ where: { id } });
  }

  async rosterByCompany(companyId: string) {
    const users = await this.prisma.user.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rut: true,
        role: true,
        certifications: {
          orderBy: { expiresAt: 'asc' },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return users.map(u => ({
      ...u,
      certifications: u.certifications.map(c => enrich(c)),
      stats: {
        total: u.certifications.length,
        vencido: u.certifications.filter(c => computeStatus(c.expiresAt) === 'VENCIDO').length,
        porVencer: u.certifications.filter(c => computeStatus(c.expiresAt) === 'POR_VENCER').length,
      },
    }));
  }
}
