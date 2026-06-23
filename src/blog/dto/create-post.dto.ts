import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { BlogStatus } from '@prisma/client';

export class CreatePostDto {
  @ApiProperty({ example: 'Frontend o\'rganishni qayerdan boshlash kerak' })
  @IsString() @MinLength(3)
  title!: string;

  @ApiProperty({ example: 'frontend-organishni-qayerdan-boshlash' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug faqat kichik harf/raqam va '-'" })
  slug!: string;

  @ApiProperty({ example: 'Yangi boshlovchilar uchun amaliy yo\'l xaritasi.' })
  @IsString() @MinLength(10)
  excerpt!: string;

  @ApiProperty({ description: 'Markdown yoki HTML' })
  @IsString() @MinLength(20)
  content!: string;

  @ApiPropertyOptional({ example: '/uploads/blog/abc.jpg' })
  @IsOptional() @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional() @IsInt() @Min(1)
  readMinutes?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: BlogStatus, default: BlogStatus.draft })
  @IsOptional() @IsEnum(BlogStatus)
  status?: BlogStatus;
}
