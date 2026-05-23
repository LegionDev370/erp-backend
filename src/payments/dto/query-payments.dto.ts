import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryPaymentsDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional() @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional() @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ example: 2026, minimum: 2020, maximum: 2100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(2020) @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 9, minimum: 1, maximum: 12, description: "Year bilan birga ishlatiladi" })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12)
  month?: number;
}
