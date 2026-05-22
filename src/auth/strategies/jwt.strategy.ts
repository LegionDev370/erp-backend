import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') ?? 'dev-jwt-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, deletedAt: true, role: true, email: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Foydalanuvchi topilmadi");
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException(`Hisob holati: ${user.status}`);
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
