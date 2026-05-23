import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ example: 'Vazifa 1: HTML asoslari' })
  @IsString() @MinLength(2)
  title!: string;

  @ApiProperty({ example: 'HTML5 form va semantik teglar bilan loyiha' })
  @IsString() @MinLength(5)
  description!: string;

  @ApiProperty({ example: '2026-09-20T23:59:00.000Z' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 1000 })
  @IsOptional() @IsInt() @Min(1) @Max(1000)
  maxScore?: number;
}
