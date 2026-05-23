import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ExamStatus } from '@prisma/client';

export class CreateExamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ example: 'Yakuniy imtihon - Frontend' })
  @IsString() @MinLength(2)
  title!: string;

  @ApiProperty({ example: '2027-02-15T10:00:00.000Z' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ default: 60, minimum: 5, maximum: 480 })
  @IsOptional() @IsInt() @Min(5) @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsInt() @Min(0)
  questionsCount?: number;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 1000 })
  @IsOptional() @IsInt() @Min(1) @Max(1000)
  maxScore?: number;

  @ApiPropertyOptional({ enum: ExamStatus, default: ExamStatus.upcoming })
  @IsOptional() @IsEnum(ExamStatus)
  status?: ExamStatus;
}
