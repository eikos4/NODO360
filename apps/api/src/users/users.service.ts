import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  rut: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  companyId: true,
  isActive: true,
  photoUrl: true,
  operativeNumber: true,
  createdAt: true,
  company: { select: { id: true, name: true, number: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.user.findMany({
      where: companyId ? { companyId } : {},
      select: USER_SELECT,
      orderBy: [{ operativeNumber: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  private async assertOperativeNumber(
    companyId: string | null | undefined,
    operativeNumber: number | null | undefined,
    excludeUserId?: string,
  ) {
    if (operativeNumber == null) return;
    if (!companyId) {
      throw new BadRequestException('El N° operativo requiere asignar una compañía');
    }
    const dup = await this.prisma.user.findFirst({
      where: {
        companyId,
        operativeNumber,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
    if (dup) {
      throw new ConflictException(
        `El N° operativo ${operativeNumber} ya está asignado en esta compañía`,
      );
    }
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { rut: dto.rut }] },
    });
    if (exists) throw new ConflictException('Email o RUT ya registrado');
    await this.assertOperativeNumber(dto.companyId, dto.operativeNumber);

    const { password, ...rest } = dto;
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { ...rest, passwordHash },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const current = await this.findById(id);
    const { password, operativeNumber, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };

    if (operativeNumber !== undefined) {
      if (operativeNumber != null && (operativeNumber < 1 || operativeNumber > 999)) {
        throw new BadRequestException('N° operativo debe ser entre 1 y 999');
      }
      data.operativeNumber = operativeNumber;
    }
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const companyId = (rest.companyId ?? current.companyId) as string | null;
    const nextNumber =
      operativeNumber !== undefined ? operativeNumber : current.operativeNumber;
    await this.assertOperativeNumber(companyId, nextNumber ?? undefined, id);

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }
}
