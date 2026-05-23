import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { GroupFormat, GroupStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryGroupsDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({ enum: GroupStatus })
  @IsOptional() @IsEnum(GroupStatus)
  status?: GroupStatus;

  @ApiPropertyOptional({ enum: GroupFormat })
  @IsOptional() @IsEnum(GroupFormat)
  format?: GroupFormat;

  @ApiPropertyOptional({ description: 'Xona bo\'yicha filter' })
  @IsOptional() @IsString()
  room?: string;
}
