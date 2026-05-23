import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GradeSubmissionDto {
  @ApiProperty({ minimum: 0, description: "Baho (assignment.maxScore'dan oshmasligi kerak)" })
  @IsInt() @Min(0) @Max(1000)
  grade!: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  comment?: string;
}
