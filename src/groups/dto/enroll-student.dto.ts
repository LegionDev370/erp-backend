import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class EnrollStudentDto {
  @ApiProperty({ format: 'uuid', description: 'student.id (talaba record IDsi)' })
  @IsUUID()
  studentId!: string;
}
