import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAssignmentDto } from './create-assignment.dto';

export class UpdateAssignmentDto extends PartialType(OmitType(CreateAssignmentDto, ['groupId'] as const)) {}
