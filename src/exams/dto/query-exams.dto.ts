import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ExamStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryExamsDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ enum: ExamStatus })
  @IsOptional() @IsEnum(ExamStatus)
  status?: ExamStatus;
}
