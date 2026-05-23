import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { QueryAssignmentsDto } from './dto/query-assignments.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin · Assignments')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @ApiOperation({ summary: "Vazifalar ro'yxati (filter: groupId)" })
  list(@Query() q: QueryAssignmentsDto) {
    return this.assignmentsService.list(q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Yangi vazifa (guruhdagi active talabalarga pending submissionlar avto-yaratiladi)",
  })
  create(@Body() dto: CreateAssignmentDto, @CurrentUser('sub') userId: string) {
    return this.assignmentsService.create(dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Vazifa tafsiloti' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Vazifani yangilash' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vazifani o'chirish (cascade submissions)" })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.assignmentsService.remove(id);
  }

  // ===== Grades =====
  @Get(':id/grades')
  @ApiOperation({ summary: 'Vazifa uchun barcha talabalar baholari' })
  listGrades(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.assignmentsService.listGrades(id);
  }

  @Patch(':id/grades/:studentId')
  @ApiOperation({ summary: 'Talabaga baho qo\'yish (upsert)' })
  grade(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.assignmentsService.grade(id, studentId, dto);
  }
}
