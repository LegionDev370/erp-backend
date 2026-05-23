import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Marketing' })
  @IsString() @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: '#2563EB', description: "HEX rang (#RRGGBB)" })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: "Color #RRGGBB formatida bo'lishi kerak" })
  color?: string;
}
