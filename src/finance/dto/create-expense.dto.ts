import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: "Ofis ijara haqi - Sentyabr" })
  @IsString() @MinLength(2)
  description!: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber() @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: '/uploads/documents/invoice.pdf' })
  @IsOptional() @IsString()
  attachmentUrl?: string;
}
