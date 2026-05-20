import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';

const INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, role: true, rut: true } },
};

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: string, companyId?: string, from?: string, to?: string) {
    return this.prisma.shift.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(companyId ? { user: { companyId } } : {}),
        ...(from || to ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        } : {}),
      },
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
  }

  async findById(id: string) {
    const s = await this.prisma.shift.findUnique({ where: { id }, include: INCLUDE });
    if (!s) throw new NotFoundException('Turno no encontrado');
    return s;
  }

  async create(dto: CreateShiftDto) {
    const { userIds, ...baseData } = dto;
    const ids = userIds?.length ? userIds : [];

    if (!ids.length) {
      return this.prisma.shift.create({ data: { ...baseData, userId: '' }, include: INCLUDE });
    }

    const shifts = await Promise.all(
      ids.map(userId =>
        this.prisma.shift.create({ data: { ...baseData, userId }, include: INCLUDE })
      )
    );
    return shifts;
  }

  async update(id: string, dto: Partial<CreateShiftDto>) {
    await this.findById(id);
    const { userIds, ...data } = dto;
    return this.prisma.shift.update({ where: { id }, data, include: INCLUDE });
  }

  async markPresent(id: string, present: boolean) {
    await this.findById(id);
    return this.prisma.shift.update({ where: { id }, data: { present }, include: INCLUDE });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.shift.delete({ where: { id } });
  }

  async getUpcoming(companyId?: string) {
    const now = new Date();
    return this.prisma.shift.findMany({
      where: {
        date: { gte: now },
        ...(companyId ? { user: { companyId } } : {}),
      },
      include: INCLUDE,
      orderBy: { date: 'asc' },
      take: 20,
    });
  }
}
