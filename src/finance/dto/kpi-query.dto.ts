import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class KpiQueryDto {
  @ApiPropertyOptional({ example: 2026, description: "Yil (berilmasa - joriy)" })
  @IsOptional() @Type(() => Number) @IsInt() @Min(2020) @Max(2100)
  year?: number;
}
