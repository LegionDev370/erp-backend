import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthResponseDto, AuthTokensDto, AuthUserDto } from './dto/auth-response.dto';

import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Yangi talaba ro'yxatdan o'tadi" })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.register(dto, this.extractMeta(req));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Email/telefon va parol orqali kirish' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.login(dto, this.extractMeta(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token orqali yangi access token olish' })
  @ApiResponse({ status: 200, type: AuthTokensDto })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthTokensDto> {
    return this.authService.refresh(dto.refreshToken, this.extractMeta(req));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sessiyani tugatish' })
  logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    return this.authService.logout(dto.refreshToken, userId);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Parolni tiklash uchun email yuborish' })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Token bilan parolni yangilash' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email manzilini tasdiqlash' })
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    return this.authService.verifyEmail(dto.token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({ summary: "Joriy foydalanuvchi ma'lumotlari" })
  @ApiResponse({ status: 200, type: AuthUserDto })
  me(@CurrentUser() user: JwtPayload): Promise<AuthUserDto> {
    return this.authService.me(user.sub);
  }

  // ----------------------------------------------------------------
  private extractMeta(req: Request): { ipAddress?: string; userAgent?: string; device?: string } {
    const userAgent = req.headers['user-agent'];
    return {
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip,
      userAgent,
      device: this.parseDevice(userAgent),
    };
  }

  private parseDevice(ua?: string): string | undefined {
    if (!ua) return undefined;
    // Juda oddiy parser - keyinroq ua-parser-js bilan almashtirilishi mumkin
    const browser = /Chrome|Firefox|Safari|Edge|Opera/.exec(ua)?.[0] ?? 'Unknown';
    const os = /Windows|Mac OS X|Linux|Android|iOS|iPhone|iPad/.exec(ua)?.[0] ?? 'Unknown';
    return `${os} · ${browser}`;
  }
}
