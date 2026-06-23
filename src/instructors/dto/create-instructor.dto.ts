import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { Gender, InstructorStatus } from '@prisma/client';

export class InstructorSocialLinksDto {
  @ApiPropertyOptional() @IsOptional() @IsString() github?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkedin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telegram?: string;
}

export class CreateInstructorDto {
  // ===== USER =====
  @ApiProperty() @IsEmail() email!: string;

  @ApiProperty({ example: '+998901112233' })
  @Matches(/^\+998\d{9}$/, { message: "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak" })
  phone!: string;

  @ApiProperty({ example: 'Strong123' })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message: "Parolda kamida 1 ta katta harf va 1 ta raqam bo'lishi kerak",
  })
  password!: string;

  @ApiProperty() @IsString() @MinLength(2) firstName!: string;
  @ApiProperty() @IsString() @MinLength(2) lastName!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() middleName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional({ enum: Gender }) @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;

  // ===== INSTRUCTOR =====
  @ApiProperty({ example: 'JavaScript / Frontend' })
  @IsString()
  specialty!: string;

  @ApiPropertyOptional({ default: 0, description: 'Tajriba yillarda' })
  @IsOptional() @IsInt() @Min(0)
  experience?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  bio?: string;

  @ApiPropertyOptional({ type: InstructorSocialLinksDto })
  @IsOptional()
  @IsObject()
  socialLinks?: InstructorSocialLinksDto;

  @ApiPropertyOptional({ enum: InstructorStatus, default: InstructorStatus.active })
  @IsOptional() @IsEnum(InstructorStatus)
  status?: InstructorStatus;
}
