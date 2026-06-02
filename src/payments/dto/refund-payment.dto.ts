import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefundPaymentDto {
  @ApiPropertyOptional({ description: "Refund sababi" })
  @IsOptional() @IsString()
  reason?: string;
}
