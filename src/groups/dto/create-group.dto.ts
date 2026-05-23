import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { GroupFormat, GroupStatus } from '@prisma/client';

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export class CreateGroupDto {
  @ApiProperty({ example: 'Frontend-01' })
  @IsString() @MinLength(2)
  name!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  courseId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teacherId!: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2027-03-01' })
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: GroupStatus, default: GroupStatus.upcoming })
  @IsOptional() @IsEnum(GroupStatus)
  status?: GroupStatus;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 200 })
  @IsOptional() @IsInt() @Min(1) @Max(200)
  maxStudents?: number;

  @ApiPropertyOptional({ example: 'A-101' })
  @IsOptional() @IsString()
  room?: string;

  @ApiPropertyOptional({ enum: GroupFormat, default: GroupFormat.offline })
  @IsOptional() @IsEnum(GroupFormat)
  format?: GroupFormat;

  @ApiProperty({
    example: ['mon', 'wed', 'fri'],
    description: "Hafta kunlari (kichik harf): mon|tue|wed|thu|fri|sat|sun",
    enum: WEEKDAYS,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsIn(WEEKDAYS, { each: true })
  scheduleDays!: Weekday[];

  @ApiProperty({ example: '09:00', description: 'HH:MM formatida' })
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, { message: "Vaqt HH:MM formatida bo'lishi kerak" })
  scheduleTime!: string;

  @ApiProperty({ example: 500000 })
  @IsNumber() @IsPositive()
  monthlyPrice!: number;
}
