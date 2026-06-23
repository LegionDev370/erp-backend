import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ContactStatus } from '@prisma/client';

export class UpdateContactStatusDto {
  @ApiProperty({ enum: ContactStatus, example: ContactStatus.read })
  @IsEnum(ContactStatus)
  status!: ContactStatus;
}
