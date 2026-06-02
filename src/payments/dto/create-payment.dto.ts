import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ example: 500000 })
  @IsNumber() @IsPositive()
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.pending })
  @IsOptional() @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: "To'lov sanasi (paid bo'lsa avto: hozir)" })
  @IsOptional() @IsDateString()
  paidAt?: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ description: "Tashqi to'lov tizimi tranzaksiya IDsi" })
  @IsOptional() @IsString()
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
