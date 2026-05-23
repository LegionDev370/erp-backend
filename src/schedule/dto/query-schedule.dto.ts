import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LessonStatus } from '@prisma/client';

export class QueryScheduleDto {
  @ApiPropertyOptional({ example: '2026-09-01', description: 'Sanadan boshlab' })
  @IsOptional() @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Sanagacha (inklyuziv)' })
  @IsOptional() @IsDateString()
  to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Xona nomi' })
  @IsOptional() @IsString()
  room?: string;

  @ApiPropertyOptional({ enum: LessonStatus })
  @IsOptional() @IsEnum(LessonStatus)
  status?: LessonStatus;
}
