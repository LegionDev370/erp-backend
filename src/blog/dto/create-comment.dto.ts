import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Aziz' })
  @IsString() @MinLength(2)
  authorName!: string;

  @ApiProperty({ example: 'aziz@example.com' })
  @IsEmail()
  authorEmail!: string;

  @ApiProperty({ example: 'Juda foydali maqola, rahmat!' })
  @IsString() @MinLength(3)
  text!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Javob berilayotgan izoh (thread)' })
  @IsOptional() @IsUUID()
  parentId?: string;
}
