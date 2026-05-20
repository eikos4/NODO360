import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHydrantDto } from './dto/create-hydrant.dto';
import { UpdateHydrantDto } from './dto/update-hydrant.dto';

@Injectable()
export class HydrantsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { type?: string; status?: string; companyId?: string }) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    return this.prisma.hydrant.findMany({
      where,
      include: { company: true },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const hydrant = await this.prisma.hydrant.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!hydrant) {
      throw new NotFoundException('Hidrante no encontrado');
    }

    return hydrant;
  }

  async create(dto: CreateHydrantDto) {
    return this.prisma.hydrant.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateHydrantDto) {
    await this.findOne(id);

    return this.prisma.hydrant.update({
      where: { id },
      data: {
        ...dto,
        lastInspectionAt: dto.lastInspectionAt ? new Date(dto.lastInspectionAt) : undefined,
        nextInspectionAt: dto.nextInspectionAt ? new Date(dto.nextInspectionAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.hydrant.delete({
      where: { id },
    });
  }
}
