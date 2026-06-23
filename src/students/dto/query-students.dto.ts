import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StudentStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryStudentsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StudentStatus, description: "Talaba holati bo'yicha filter" })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}
