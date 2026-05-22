import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { UserStatus } from '@prisma/client';

/**
 * Yangilash uchun barcha maydonlar ixtiyoriy.
 * `password` o'zgartirilmaydi (alohida endpoint orqali) - shuning uchun chiqarib tashlaymiz.
 */
export class UpdateStudentDto extends PartialType(
  OmitType(CreateStudentDto, ['password'] as const),
) {
  @ApiPropertyOptional({ enum: UserStatus, description: "Foydalanuvchi holati" })
  @IsOptional()
  @IsEnum(UserStatus)
  userStatus?: UserStatus;
}
