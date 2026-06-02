import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryExpensesDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(2020) @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 9 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12)
  month?: number;
}
