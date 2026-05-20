import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany({
      where: { isActive: true },
      include: { _count: { select: { users: true, vehicles: true, equipment: true } } },
      orderBy: { number: 'asc' },
    });
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
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

  async create(dto: CreateCompanyDto) {
    const exists = await this.prisma.company.findUnique({ where: { number: dto.number } });
    if (exists) throw new ConflictException(`Ya existe una compañía con el número ${dto.number}`);
    return this.prisma.company.create({ data: dto });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findById(id);
    console.log('CompaniesService.update received dto:', dto);
    if (dto.number) {
      const exists = await this.prisma.company.findFirst({ where: { number: dto.number, id: { not: id } } });
      if (exists) throw new ConflictException(`Ya existe una compañía con el número ${dto.number}`);
    }
    const result = this.prisma.company.update({ where: { id }, data: dto });
    console.log('CompaniesService.update result:', result);
    return result;
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.company.update({ where: { id }, data: { isActive: false } });
  }
}
