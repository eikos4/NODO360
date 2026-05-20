import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembershipFeeDto } from './dto/create-membership-fee.dto';
import { UpdateMembershipFeeDto } from './dto/update-membership-fee.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
import { UpsertMemberProfileDto } from './dto/upsert-member-profile.dto';
import { ContributionStatus, MembershipStatus, Prisma } from '@prisma/client';

const userSelect = {
  id: true,
  rut: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isActive: true,
} as const;

const companySelect = { id: true, name: true, number: true } as const;

@Injectable()
export class MembershipService {
  constructor(private prisma: PrismaService) {}

  /* ── Cuotas / períodos ── */

  async findFees(companyId?: string, year?: number) {
    return this.prisma.membershipFee.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(year ? { year } : {}),
      },
      include: {
        company: { select: companySelect },
        _count: { select: { contributions: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findFeeById(id: string) {
    const fee = await this.prisma.membershipFee.findUnique({
      where: { id },
      include: {
        company: { select: companySelect },
        contributions: {
          include: { user: { select: userSelect } },
          orderBy: { paidAt: 'desc' },
        },
      },
    });
    if (!fee) throw new NotFoundException('Cuota no encontrada');
    return fee;
  }

  async createFee(dto: CreateMembershipFeeDto) {
    return this.prisma.membershipFee.create({
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: { company: { select: companySelect } },
    });
  }

  async updateFee(id: string, dto: UpdateMembershipFeeDto) {
    await this.findFeeById(id);
    return this.prisma.membershipFee.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
      },
      include: { company: { select: companySelect } },
    });
  }

  async removeFee(id: string) {
    await this.findFeeById(id);
    return this.prisma.membershipFee.delete({ where: { id } });
  }

  /* ── Aportes ── */

  async findContributions(filters?: {
    companyId?: string;
    feeId?: string;
    userId?: string;
    year?: number;
    month?: number;
  }) {
    const where: Prisma.SocialContributionWhereInput = {};

    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.feeId) where.feeId = filters.feeId;
    if (filters?.userId) where.userId = filters.userId;

    if (filters?.year) {
      where.paidAt = {
        gte: new Date(filters.year, (filters.month ?? 1) - 1, 1),
        lt: filters.month
          ? new Date(filters.year, filters.month, 1)
          : new Date(filters.year + 1, 0, 1),
      };
    }

    return this.prisma.socialContribution.findMany({
      where,
      include: {
        user: { select: userSelect },
        company: { select: companySelect },
        fee: true,
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  async createContribution(dto: CreateContributionDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Socio no encontrado');
    if (user.companyId && user.companyId !== dto.companyId) {
      throw new BadRequestException('El socio no pertenece a esta compañía');
    }

    if (dto.feeId) {
      const fee = await this.prisma.membershipFee.findUnique({ where: { id: dto.feeId } });
      if (!fee || fee.companyId !== dto.companyId) {
        throw new BadRequestException('Cuota inválida para esta compañía');
      }
    }

    let status: ContributionStatus = dto.status ?? ContributionStatus.PAGADO;
    if (!dto.status && dto.feeId) {
      const fee = await this.prisma.membershipFee.findUnique({ where: { id: dto.feeId } });
      if (fee && dto.amount < fee.amount) status = ContributionStatus.PARCIAL;
    }

    const { paidAt, ...rest } = dto;
    return this.prisma.socialContribution.create({
      data: {
        ...rest,
        status,
        paidAt: new Date(paidAt),
      },
      include: {
        user: { select: userSelect },
        company: { select: companySelect },
        fee: true,
      },
    });
  }

  async updateContribution(id: string, dto: UpdateContributionDto) {
    const existing = await this.prisma.socialContribution.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Aporte no encontrado');

    return this.prisma.socialContribution.update({
      where: { id },
      data: {
        ...dto,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      },
      include: {
        user: { select: userSelect },
        company: { select: companySelect },
        fee: true,
      },
    });
  }

  async removeContribution(id: string) {
    const existing = await this.prisma.socialContribution.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Aporte no encontrado');
    return this.prisma.socialContribution.delete({ where: { id } });
  }

  /* ── Socios / nómina ── */

  async getMembersRoster(companyId: string, feeId?: string, year?: number, month?: number) {
    const fee = feeId
      ? await this.prisma.membershipFee.findUnique({ where: { id: feeId } })
      : await this.resolveFee(companyId, year, month);

    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        role: { not: 'SUPER_ADMIN' },
      },
      select: {
        ...userSelect,
        memberProfile: true,
        ...(fee
          ? {
              contributions: {
                where: { feeId: fee.id },
                orderBy: { paidAt: 'desc' as const },
              },
            }
          : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const expectedAmount = fee?.amount ?? 0;
    const duePassed = fee?.dueDate ? new Date(fee.dueDate) < new Date() : false;

    return users.map(u => {
      const contributions = (u as any).contributions ?? [];
      const paidTotal = contributions.reduce((s: number, c: { amount: number }) => s + c.amount, 0);
      const latest = contributions[0];

      let paymentStatus: 'PAGADO' | 'PARCIAL' | 'PENDIENTE' | 'EXONERADO' | 'SIN_CUOTA' = 'SIN_CUOTA';
      if (!fee) paymentStatus = 'SIN_CUOTA';
      else if (latest?.status === ContributionStatus.EXONERADO) paymentStatus = 'EXONERADO';
      else if (paidTotal >= expectedAmount) paymentStatus = 'PAGADO';
      else if (paidTotal > 0) paymentStatus = 'PARCIAL';
      else paymentStatus = 'PENDIENTE';

      const profileStatus = u.memberProfile?.status ?? MembershipStatus.ACTIVO;
      const isMoroso =
        paymentStatus === 'PENDIENTE' &&
        duePassed &&
        profileStatus !== MembershipStatus.SUSPENDIDO &&
        profileStatus !== MembershipStatus.INACTIVO;

      return {
        user: {
          id: u.id,
          rut: u.rut,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: u.role,
        },
        profile: u.memberProfile,
        paymentStatus,
        isMoroso,
        paidTotal,
        expectedAmount,
        latestContribution: latest ?? null,
        contributionsCount: contributions.length,
      };
    });
  }

  async upsertMemberProfile(userId: string, dto: UpsertMemberProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.memberProfile.upsert({
      where: { userId },
      create: {
        userId,
        companyId: dto.companyId,
        memberNumber: dto.memberNumber,
        status: dto.status ?? MembershipStatus.ACTIVO,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
        notes: dto.notes,
      },
      update: {
        memberNumber: dto.memberNumber,
        status: dto.status,
        joinedAt: dto.joinedAt !== undefined ? (dto.joinedAt ? new Date(dto.joinedAt) : null) : undefined,
        notes: dto.notes,
      },
      include: { user: { select: userSelect } },
    });
  }

  /* ── Dashboard ── */

  async getDashboard(companyId?: string, year?: number, month?: number) {
    const y = year ?? new Date().getFullYear();
    const m = month ?? new Date().getMonth() + 1;

    const companyWhere = companyId ? { companyId } : {};

    const [fees, contributionsYtd, contributionsMonth, companies] = await Promise.all([
      this.prisma.membershipFee.findMany({
        where: { ...companyWhere, year: y, isActive: true },
        include: { company: { select: companySelect }, _count: { select: { contributions: true } } },
        orderBy: [{ month: 'desc' }],
      }),
      this.prisma.socialContribution.aggregate({
        where: {
          ...companyWhere,
          paidAt: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) },
          status: { not: ContributionStatus.EXONERADO },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.socialContribution.aggregate({
        where: {
          ...companyWhere,
          paidAt: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) },
          status: { not: ContributionStatus.EXONERADO },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.company.findMany({
        where: companyId ? { id: companyId } : { isActive: true },
        select: { id: true, name: true, number: true },
        orderBy: { number: 'asc' },
      }),
    ]);

    const byCompany = await Promise.all(
      companies.map(async c => {
        const fee = await this.resolveFee(c.id, y, m);
        const roster = fee ? await this.getMembersRoster(c.id, fee.id) : [];
        const activeMembers = roster.filter(r => r.profile?.status !== MembershipStatus.INACTIVO).length;
        const paid = roster.filter(r => r.paymentStatus === 'PAGADO' || r.paymentStatus === 'EXONERADO').length;
        const morosos = roster.filter(r => r.isMoroso).length;
        const collected = roster.reduce((s, r) => s + r.paidTotal, 0);
        const expected = fee ? activeMembers * fee.amount : 0;

        const monthContrib = await this.prisma.socialContribution.aggregate({
          where: {
            companyId: c.id,
            paidAt: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) },
            status: { not: ContributionStatus.EXONERADO },
          },
          _sum: { amount: true },
        });

        return {
          company: c,
          currentFee: fee,
          activeMembers,
          paidCount: paid,
          morososCount: morosos,
          collectionRate: activeMembers > 0 ? Math.round((paid / activeMembers) * 100) : 0,
          collectedMonth: monthContrib._sum.amount ?? 0,
          collectedRoster: collected,
          expectedTotal: expected,
        };
      }),
    );

    const totalMorosos = byCompany.reduce((s, c) => s + c.morososCount, 0);
    const totalMembers = byCompany.reduce((s, c) => s + c.activeMembers, 0);
    const totalPaid = byCompany.reduce((s, c) => s + c.paidCount, 0);

    return {
      year: y,
      month: m,
      summary: {
        collectedYtd: contributionsYtd._sum.amount ?? 0,
        paymentsYtd: contributionsYtd._count.id,
        collectedMonth: contributionsMonth._sum.amount ?? 0,
        paymentsMonth: contributionsMonth._count.id,
        totalMembers,
        totalPaid,
        totalMorosos,
        collectionRate: totalMembers > 0 ? Math.round((totalPaid / totalMembers) * 100) : 0,
      },
      fees,
      byCompany,
    };
  }

  private async resolveFee(companyId: string, year?: number, month?: number) {
    const y = year ?? new Date().getFullYear();
    const m = month ?? new Date().getMonth() + 1;

    return this.prisma.membershipFee.findFirst({
      where: {
        companyId,
        year: y,
        month: m,
        isActive: true,
        frequency: 'MENSUAL',
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
