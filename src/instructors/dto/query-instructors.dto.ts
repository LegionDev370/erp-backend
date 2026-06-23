import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InstructorStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryInstructorsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: InstructorStatus })
  @IsOptional()
  @IsEnum(InstructorStatus)
  status?: InstructorStatus;

  @ApiPropertyOptional({ description: "Mutaxassislik bo'yicha filter" })
  @IsOptional()
  @IsString()
  specialty?: string;
}
