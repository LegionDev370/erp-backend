import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { BlogStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryPostsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Kategoriya slug' })
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: BlogStatus, description: 'Faqat admin (public: published)' })
  @IsOptional() @IsEnum(BlogStatus)
  status?: BlogStatus;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  featured?: boolean;
}
