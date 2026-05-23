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

import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { QueryGroupsDto } from './dto/query-groups.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { AttendanceService } from '../attendance/attendance.service';
import { QueryAttendanceMatrixDto } from '../attendance/dto/query-attendance.dto';

@ApiTags('Admin · Groups')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly attendanceService: AttendanceService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Guruhlar ro'yxati (filter: course, teacher, status, format)" })
  list(@Query() q: QueryGroupsDto) {
    return this.groupsService.list(q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi guruh yaratish' })
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Guruh tafsiloti' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Guruhni yangilash' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Guruhni o\'chirish' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.groupsService.remove(id);
  }

  // ===== Students =====
  @Get(':id/students')
  @ApiOperation({ summary: 'Guruh tarkibi' })
  listStudents(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.groupsService.listStudents(id);
  }

  @Post(':id/students')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Guruhga talaba qo\'shish' })
  enrollStudent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: EnrollStudentDto,
  ) {
    return this.groupsService.enrollStudent(id, dto.studentId);
  }

  @Delete(':id/students/:studentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Talabani guruhdan chiqarish' })
  removeStudent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.groupsService.removeStudent(id, studentId);
  }

  @Get(':id/attendance-matrix')
  @ApiOperation({ summary: 'Davomat matritsasi (talaba×dars)' })
  attendanceMatrix(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() q: QueryAttendanceMatrixDto,
  ) {
    return this.attendanceService.matrix(id, q);
  }
}
