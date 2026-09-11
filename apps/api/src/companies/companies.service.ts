import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Actor, cuerpoIdForUser, isPlatformOwner } from '../common/cuerpo-scope';

const CUERPO_SELECT = { id: true, name: true, city: true, slug: true } as const;

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findAll(actor?: Actor) {
    const where: { isActive: boolean; cuerpoId?: string } = { isActive: true };
    if (actor && !isPlatformOwner(actor.role)) {
      const cuerpoId = await cuerpoIdForUser(this.prisma, actor);
      if (cuerpoId) where.cuerpoId = cuerpoId;
    }
    return this.prisma.company.findMany({
      where,
      include: {
        cuerpo: { select: CUERPO_SELECT },
        _count: { select: { users: true, vehicles: true, equipment: true, emergencyBitacora: true } },
      },
      orderBy: [{ cuerpo: { name: 'asc' } }, { number: 'asc' }],
    });
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        cuerpo: { select: CUERPO_SELECT },
        users: {
          select: { id: true, firstName: true, lastName: true, role: true, isActive: true },
          where: { isActive: true },
        },
        vehicles: true,
        _count: { select: { users: true, vehicles: true, equipment: true } },
      },
    });
    if (!company) throw new NotFoundException('Compañía no encontrada');
    return company;
  }

  async create(dto: CreateCompanyDto, actor?: Actor) {
    const cuerpoId = dto.cuerpoId || (actor ? await cuerpoIdForUser(this.prisma, actor) : null);
    if (!cuerpoId) throw new BadRequestException('Seleccione un Cuerpo para la compañía');

    const exists = await this.prisma.company.findUnique({
      where: { cuerpoId_number: { cuerpoId, number: dto.number } },
    });
    if (exists) throw new ConflictException(`Ya existe la ${dto.number}ª en este Cuerpo`);

    const { cuerpoId: _ignored, ...rest } = dto;
    return this.prisma.company.create({
      data: { ...rest, cuerpoId },
      include: { cuerpo: { select: CUERPO_SELECT } },
    });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const current = await this.findById(id);
    if (dto.number) {
      const exists = await this.prisma.company.findFirst({
        where: { cuerpoId: current.cuerpoId, number: dto.number, id: { not: id } },
      });
      if (exists) throw new ConflictException(`Ya existe la ${dto.number}ª en este Cuerpo`);
    }
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.company.update({ where: { id }, data: { isActive: false } });
  }
}
