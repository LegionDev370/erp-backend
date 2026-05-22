import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email tasdiqlash uchun token' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
