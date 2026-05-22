import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, AuthTokensDto, AuthUserDto } from './dto/auth-response.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
  device?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ============================================================
  // REGISTER (default role: student)
  // ============================================================
  async register(dto: RegisterDto, meta: SessionMeta = {}): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
      select: { id: true, email: true, phone: true },
    });
    if (existing) {
      if (existing.email === dto.email) {
        throw new ConflictException("Bu email allaqachon ro'yxatdan o'tgan");
      }
      throw new ConflictException("Bu telefon raqami allaqachon ro'yxatdan o'tgan");
    }

    const rounds = this.config.get<number>('app.bcryptRounds') ?? 12;
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const studentId = await this.generateStudentId();

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          gender: dto.gender,
          role: UserRole.student,
        },
      });
      await tx.student.create({
        data: {
          userId: created.id,
          studentId,
          parentFirstName: '',
          parentLastName: '',
          parentPhone: '',
          enrolledAt: new Date(),
        },
      });
      return created;
    });

    // (Ixtiyoriy) email verification token yaratish — keyinchalik Email modul orqali yuboriladi
    await this.createEmailVerificationToken(user.id);

    const tokens = await this.issueTokens(user, meta);
    return { user: this.toAuthUser(user), tokens };
  }

  // ============================================================
  // LOGIN (email yoki telefon orqali)
  // ============================================================
  async login(dto: LoginDto, meta: SessionMeta = {}): Promise<AuthResponseDto> {
    const isEmail = dto.identifier.includes('@');
    const user = await this.prisma.user.findFirst({
      where: isEmail ? { email: dto.identifier } : { phone: dto.identifier },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Email/telefon yoki parol noto'g'ri");
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException(`Hisob holati: ${user.status}`);
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Email/telefon yoki parol noto'g'ri");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user, meta);
    return { user: this.toAuthUser(user), tokens };
  }

  // ============================================================
  // REFRESH
  // ============================================================
  async refresh(refreshToken: string, meta: SessionMeta = {}): Promise<AuthTokensDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException("Refresh token noto'g'ri yoki muddati tugagan");
    }

    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessiya topilmadi yoki muddati tugagan');
    }
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException("Token egasi mos kelmadi");
    }
    if (session.user.status !== 'active' || session.user.deletedAt) {
      throw new UnauthorizedException("Hisob faol emas");
    }

    // Rotate: eski sessiyani o'chiramiz, yangisini yaratamiz
    await this.prisma.session.delete({ where: { id: session.id } });
    return this.issueTokens(session.user, meta);
  }

  // ============================================================
  // LOGOUT (joriy refresh token bo'yicha sessiyani o'chirish)
  // ============================================================
  async logout(refreshToken?: string, userId?: string): Promise<{ message: string }> {
    if (refreshToken) {
      await this.prisma.session.deleteMany({ where: { refreshToken } });
    } else if (userId) {
      await this.prisma.session.deleteMany({ where: { userId } });
    }
    return { message: 'Tizimdan muvaffaqiyatli chiqildi' };
  }

  // ============================================================
  // ME — joriy foydalanuvchi
  // ============================================================
  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException("Foydalanuvchi topilmadi");
    }
    return this.toAuthUser(user);
  }

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Information leakage'ni oldini olish uchun har doim bir xil javob beramiz
    if (!user || user.deletedAt) {
      return { message: "Agar bunday email mavjud bo'lsa, parolni tiklash havolasi yuborildi" };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 soat

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // TODO (Bosqich 6): EmailService orqali yuborish
    this.logger.log(`[DEV] Password reset token uchun ${user.email}: ${token}`);

    return { message: "Agar bunday email mavjud bo'lsa, parolni tiklash havolasi yuborildi" };
  }

  // ============================================================
  // RESET PASSWORD
  // ============================================================
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Token noto'g'ri yoki muddati tugagan");
    }

    const rounds = this.config.get<number>('app.bcryptRounds') ?? 12;
    const passwordHash = await bcrypt.hash(newPassword, rounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Xavfsizlik uchun barcha sessiyalarni o'chiramiz
      this.prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    return { message: "Parol muvaffaqiyatli yangilandi" };
  }

  // ============================================================
  // VERIFY EMAIL
  // ============================================================
  async verifyEmail(token: string): Promise<{ message: string }> {
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Token noto'g'ri yoki muddati tugagan");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Email muvaffaqiyatli tasdiqlandi' };
  }

  // ============================================================
  // INTERNAL HELPERS
  // ============================================================

  private async issueTokens(user: User, meta: SessionMeta): Promise<AuthTokensDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.expiresIn') ?? '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn') ?? '7d',
    });

    const expiresAt = this.computeExpiry(this.config.get<string>('jwt.refreshExpiresIn') ?? '7d');

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        device: meta.device,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseDurationToSeconds(this.config.get<string>('jwt.expiresIn') ?? '15m'),
      tokenType: 'Bearer',
    };
  }

  private async createEmailVerificationToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 soat
    await this.prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt },
    });
    this.logger.log(`[DEV] Email verification token ${userId}: ${token}`);
    return token;
  }

  private async generateStudentId(): Promise<string> {
    // ST-0001 dan boshlab inkrement
    const last = await this.prisma.student.findFirst({
      orderBy: { studentId: 'desc' },
      select: { studentId: true },
    });
    let next = 1;
    if (last?.studentId.startsWith('ST-')) {
      next = parseInt(last.studentId.slice(3), 10) + 1;
    }
    return `ST-${String(next).padStart(4, '0')}`;
  }

  private toAuthUser(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      avatarUrl: user.avatarUrl,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }

  private parseDurationToSeconds(s: string): number {
    const m = /^(\d+)([smhd])$/.exec(s);
    if (!m) return 900;
    const value = parseInt(m[1], 10);
    const unit = m[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 1);
  }

  private computeExpiry(s: string): Date {
    return new Date(Date.now() + this.parseDurationToSeconds(s) * 1000);
  }
}
