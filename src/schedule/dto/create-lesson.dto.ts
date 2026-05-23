import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';
import { LessonStatus } from '@prisma/client';

export class CreateLessonDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ example: '2026-09-15', description: 'Dars sanasi' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '09:00', description: 'HH:MM' })
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @ApiProperty({ example: '11:00' })
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @ApiPropertyOptional({ example: 'A-101' })
  @IsOptional() @IsString()
  room?: string;

  @ApiProperty({ example: 'JavaScript: closure va scope' })
  @IsString() @MinLength(2)
  topic!: string;

  @ApiPropertyOptional({ enum: LessonStatus, default: LessonStatus.scheduled })
  @IsOptional() @IsEnum(LessonStatus)
  status?: LessonStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
