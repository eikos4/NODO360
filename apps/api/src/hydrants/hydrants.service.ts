import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, assertCompanyAccess, companyIdWhere, companyIdsForActor } from '../common/cuerpo-scope';
import { CreateHydrantDto } from './dto/create-hydrant.dto';
import { UpdateHydrantDto } from './dto/update-hydrant.dto';

@Injectable()
export class HydrantsService {
  constructor(private prisma: PrismaService) {}

  async findAll(actor: Actor, filters?: { type?: string; status?: string; companyId?: string }) {
    const scope = companyIdWhere(await companyIdsForActor(this.prisma, actor, filters?.companyId));
    const where: Record<string, unknown> = { ...scope };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.hydrant.findMany({
      where,
      include: { company: true },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string, actor: Actor) {
    const hydrant = await this.prisma.hydrant.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!hydrant) {
      throw new NotFoundException('Hidrante no encontrado');
    }
    await assertCompanyAccess(this.prisma, actor, hydrant.companyId);

    return hydrant;
  }

  async create(dto: CreateHydrantDto, actor: Actor) {
    await assertCompanyAccess(this.prisma, actor, dto.companyId);
    return this.prisma.hydrant.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateHydrantDto, actor: Actor) {
    await this.findOne(id, actor);
    if (dto.companyId) await assertCompanyAccess(this.prisma, actor, dto.companyId);

    return this.prisma.hydrant.update({
      where: { id },
      data: {
        ...dto,
        lastInspectionAt: dto.lastInspectionAt ? new Date(dto.lastInspectionAt) : undefined,
        nextInspectionAt: dto.nextInspectionAt ? new Date(dto.nextInspectionAt) : undefined,
      },
    });
  }

  async remove(id: string, actor: Actor) {
    await this.findOne(id, actor);

    return this.prisma.hydrant.delete({
      where: { id },
    });
  }
}
