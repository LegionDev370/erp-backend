import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { StudentExamStatus } from '@prisma/client';

export class GradeExamDto {
  @ApiProperty({ minimum: 0, description: "Baho (maxScore'dan oshmasligi kerak)" })
  @IsInt() @Min(0) @Max(1000)
  grade!: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  comment?: string;

  @ApiPropertyOptional({
    enum: StudentExamStatus,
    default: StudentExamStatus.completed,
    description: "Baho qo'yilgach default 'completed'",
  })
  @IsOptional() @IsEnum(StudentExamStatus)
  status?: StudentExamStatus;
}
