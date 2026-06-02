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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { AVATAR_OPTIONS, buildMulterOptions, fileToUrl } from '../common/utils/multer.config';
import { AttendanceService } from '../attendance/attendance.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { PaymentsService } from '../payments/payments.service';

@ApiTags('Admin · Students')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly attendanceService: AttendanceService,
    private readonly assignmentsService: AssignmentsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Talabalar ro\'yxati (pagination + filter)' })
  list(@Query() q: QueryStudentsDto) {
    return this.studentsService.list(q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi talaba qo\'shish (user + student transactionda)' })
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Talaba profili' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Talaba ma\'lumotlarini yangilash' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Talabani o\'chirish (soft delete)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.studentsService.remove(id);
  }

  @Get(':id/attendance')
  @ApiOperation({ summary: "Talaba davomat tarixi (statistika bilan)" })
  attendanceHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.attendanceService.studentHistory(id);
  }

  @Get(':id/grades')
  @ApiOperation({ summary: "Talaba baholar tarixi (vazifalar)" })
  gradesHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.assignmentsService.studentGrades(id);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: "Talaba to'lov tarixi (totalPaid + totalPending bilan)" })
  paymentsHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.paymentsService.studentHistory(id);
  }

  @Post(':id/avatar')
  @ApiOperation({ summary: 'Avatar yuklash (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', buildMulterOptions(AVATAR_OPTIONS)))
  uploadAvatar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error("Fayl yuklanmadi");
    }
    return this.studentsService.setAvatar(id, fileToUrl(file, AVATAR_OPTIONS.subDir));
  }
}
