import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'student@example.com',
    description: 'Email yoki telefon raqami (+998...)',
  })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({ example: 'Strong123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
