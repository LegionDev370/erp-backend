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

import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamsDto } from './dto/query-exams.dto';
import { GradeExamDto } from './dto/grade-exam.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin · Exams')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @ApiOperation({ summary: "Imtihonlar ro'yxati (filter: groupId, status)" })
  list(@Query() q: QueryExamsDto) {
    return this.examsService.list(q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Yangi imtihon (talabalar uchun pending natijalar avto-yaratiladi)" })
  create(@Body() dto: CreateExamDto) {
    return this.examsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Imtihon tafsiloti' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.examsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Imtihonni yangilash' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateExamDto) {
    return this.examsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Imtihonni o'chirish" })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.examsService.remove(id);
  }

  @Get(':id/grades')
  @ApiOperation({ summary: 'Imtihon uchun barcha talabalar natijalari' })
  listGrades(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.examsService.listGrades(id);
  }

  @Patch(':id/grades/:studentId')
  @ApiOperation({ summary: 'Talabaga imtihon bahosini qo\'yish' })
  grade(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: GradeExamDto,
  ) {
    return this.examsService.grade(id, studentId, dto);
  }
}
