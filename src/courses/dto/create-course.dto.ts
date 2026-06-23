import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CourseLevel, CourseStatus } from '@prisma/client';

export class CreateCourseLessonDto {
  @ApiProperty() @IsString() @MinLength(1) title!: string;
  @ApiProperty({ example: 90 }) @IsInt() @Min(0) durationMinutes!: number;
  @ApiProperty({ example: 1 }) @IsInt() @Min(0) order!: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/lesson-1.mp4' })
  @IsOptional() @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Dars matni / tavsifi' })
  @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional({ default: false, description: 'Bepul ko\'rsa bo\'ladigan dars' })
  @IsOptional() @IsBoolean()
  isPreview?: boolean;
}

export class CreateCourseModuleDto {
  @ApiProperty() @IsString() @MinLength(1) title!: string;
  @ApiProperty({ example: 1 }) @IsInt() @Min(0) order!: number;

  @ApiPropertyOptional({ type: [CreateCourseLessonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCourseLessonDto)
  lessons?: CreateCourseLessonDto[];
}

export class CreateCourseDto {
  @ApiProperty({ example: 'Frontend Bootcamp' })
  @IsString() @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'frontend-bootcamp', description: 'URL-friendly slug' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug faqat kichik harf/raqam va '-' bo'lishi mumkin" })
  slug!: string;

  @ApiProperty({ example: 'HTML, CSS, JavaScript va React' })
  @IsString() @MinLength(10)
  description!: string;

  @ApiProperty({ example: 'To\'liq frontend yo\'nalishi: HTML, CSS, JS, React, Next.js...' })
  @IsString() @MinLength(20)
  longDescription!: string;

  @ApiProperty({ example: 'frontend' })
  @IsString()
  category!: string;

  @ApiPropertyOptional({ enum: CourseLevel, default: CourseLevel.beginner })
  @IsOptional() @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiProperty({ example: 1500000 })
  @IsNumber() @IsPositive()
  price!: number;

  @ApiPropertyOptional({ example: 2000000 })
  @IsOptional() @IsNumber() @IsPositive()
  oldPrice?: number;

  @ApiProperty({ example: 6 })
  @IsInt() @Min(1)
  durationMonths!: number;

  @ApiPropertyOptional({ example: 0, description: 'Auto-computed agar lessons berilsa' })
  @IsOptional() @IsInt() @Min(0)
  lessonsCount?: number;

  @ApiPropertyOptional({ example: '/uploads/courses/abc.jpg' })
  @IsOptional() @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/preview.mp4', description: 'Kurs intro videosi' })
  @IsOptional() @IsString()
  previewVideoUrl?: string;

  @ApiPropertyOptional({ description: "O'qituvchi (instructor) ID" })
  @IsOptional() @IsUUID()
  instructorId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: CourseStatus, default: CourseStatus.draft })
  @IsOptional() @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ type: [CreateCourseModuleDto], description: 'Modullar + ichidagi darslar' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCourseModuleDto)
  modules?: CreateCourseModuleDto[];
}
