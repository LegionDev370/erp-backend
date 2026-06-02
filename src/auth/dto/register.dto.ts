import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MinLength,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email!: string;

  @ApiProperty({ example: '+998901234567', description: "O'zbekiston telefon raqami" })
  @Matches(/^\+998\d{9}$/, { message: "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak" })
  phone!: string;

  @ApiProperty({
    example: 'Strong123',
    description: 'Min 8 belgi, kamida 1 katta harf, 1 raqam',
  })
  @IsString()
  @MinLength(8, { message: "Parol kamida 8 belgidan iborat bo'lishi kerak" })
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message: "Parolda kamida 1 ta katta harf va 1 ta raqam bo'lishi kerak",
  })
  password!: string;

  @ApiProperty({ example: 'Ali' })
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty({ example: 'Valiyev' })
  @IsString()
  @MinLength(2)
  lastName!: string;

  @ApiPropertyOptional({ example: "Akmaljon o'g'li" })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional({ example: '2005-03-15' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
