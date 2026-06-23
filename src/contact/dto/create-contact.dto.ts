import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'Aziz Karimov' })
  @IsString() @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'aziz@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @Matches(/^\+998\d{9}$/, { message: "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak" })
  phone?: string;

  @ApiPropertyOptional({ example: 'Kurslar haqida savol' })
  @IsOptional() @IsString()
  subject?: string;

  @ApiProperty({ example: 'Frontend kursi qachon boshlanadi?' })
  @IsString() @MinLength(5)
  message!: string;
}
