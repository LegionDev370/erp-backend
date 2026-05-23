import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateLessonDto } from './create-lesson.dto';

/**
 * groupId yangilanmaydi - bu dars boshqa guruhga ko'chmasligi kerak.
 * Agar kerak bo'lsa - eski darsni o'chirib, yangi guruhda yangi dars yaratish lozim.
 */
export class UpdateLessonDto extends PartialType(OmitType(CreateLessonDto, ['groupId'] as const)) {}
