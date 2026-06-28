import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) throw new UnauthorizedException('Credenciales inválidas');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');
    return user;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role, companyId: user.companyId };
    const company = user.companyId
      ? await this.prisma.company.findUnique({
          where: { id: user.companyId },
          select: { id: true, name: true, number: true, city: true, logoUrl: true, dispatchSlug: true },
        })
      : null;
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        rut: user.rut,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        isActive: user.isActive,
        company,
      },
    };
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
