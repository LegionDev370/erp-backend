import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryAttendanceDto {
  @ApiProperty({ format: 'uuid', description: 'Guruh IDsi (majburiy)' })
  @IsUUID()
  groupId!: string;

  @ApiPropertyOptional({ example: '2026-09-07', description: 'Sana (berilmasa, hamma dars)' })
  @IsOptional() @IsDateString()
  date?: string;
}

export class QueryAttendanceMatrixDto {
  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional() @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional() @IsDateString()
  to?: string;
}
