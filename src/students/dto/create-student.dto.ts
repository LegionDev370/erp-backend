import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Gender, StudentStatus } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ example: 'student2@example.com' })
  @IsEmail()
  email!: string;

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

  @ApiProperty({ example: 'Aziz' })
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty({ example: 'Karimov' })
  @IsString()
  @MinLength(2)
  lastName!: string;

  @ApiPropertyOptional({ example: "Akmaljon o'g'li" })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional({ example: '2005-06-12' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: "Toshkent sh., Yunusobod" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: "Platformaga ro'yxatdan o'tgan sana" })
  @IsOptional()
  @IsDateString()
  enrolledAt?: string;

  @ApiPropertyOptional({ enum: StudentStatus, default: StudentStatus.active })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}
