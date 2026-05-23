import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
