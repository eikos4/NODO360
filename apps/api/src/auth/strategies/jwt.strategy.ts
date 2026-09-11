import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload?.sub || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        isActive: true,
        company: { select: { cuerpoId: true } },
      },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('Usuario inactivo o inexistente');
    }

    return {
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      cuerpoId: user.company?.cuerpoId ?? null,
    };
  }
}
