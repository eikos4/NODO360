import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.user.findMany({
      where: companyId ? { companyId } : {},
      select: {
        id: true, rut: true, firstName: true, lastName: true,
        email: true, role: true, companyId: true, isActive: true, createdAt: true,
        company: { select: { id: true, name: true, number: true } },
      },
      orderBy: { lastName: 'asc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, rut: true, firstName: true, lastName: true,
        email: true, role: true, companyId: true, isActive: true, createdAt: true,
        company: { select: { id: true, name: true, number: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { rut: dto.rut }] },
    });
    if (exists) throw new ConflictException('Email o RUT ya registrado');
    const { password, ...rest } = dto;
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { ...rest, passwordHash },
      select: {
        id: true, rut: true, firstName: true, lastName: true,
        email: true, role: true, companyId: true, isActive: true, createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);
    const { password, ...rest } = dto;
    const data: any = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, rut: true, firstName: true, lastName: true,
        email: true, role: true, companyId: true, isActive: true, createdAt: true,
      },
    });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }
}
