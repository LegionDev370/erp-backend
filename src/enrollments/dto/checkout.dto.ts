import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CheckoutDto {
  @ApiProperty({ format: 'uuid', description: 'Sotib olinayotgan kurs' })
  @IsUUID()
  courseId!: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.payme })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ description: "To'lov tizimi tranzaksiya IDsi (mock)" })
  @IsOptional() @IsString()
  transactionId?: string;
}
