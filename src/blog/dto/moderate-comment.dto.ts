import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches, MinLength } from 'class-validator';
import { CommentStatus } from '@prisma/client';

export class ModerateCommentDto {
  @ApiProperty({ enum: CommentStatus, example: CommentStatus.approved })
  @IsEnum(CommentStatus)
  status!: CommentStatus;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Dasturlash' })
  @IsString() @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'dasturlash' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug faqat kichik harf/raqam va '-'" })
  slug!: string;
}
