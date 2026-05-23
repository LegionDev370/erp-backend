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

import { ScheduleService } from './schedule.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin · Schedule')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @ApiOperation({ summary: 'Jadval grid (calendar uchun) - barcha darslar' })
  grid(@Query() q: QueryScheduleDto) {
    return this.scheduleService.grid(q);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Xonalar bandlik holati' })
  rooms(@Query() q: QueryScheduleDto) {
    return this.scheduleService.rooms(q);
  }

  @Get('lessons/:id')
  @ApiOperation({ summary: 'Bitta dars tafsiloti' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.scheduleService.findOne(id);
  }

  @Post('lessons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi dars qo\'shish' })
  createLesson(@Body() dto: CreateLessonDto) {
    return this.scheduleService.createLesson(dto);
  }

  @Patch('lessons/:id')
  @ApiOperation({ summary: 'Darsni yangilash' })
  updateLesson(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.scheduleService.updateLesson(id, dto);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Darsni o\'chirish' })
  removeLesson(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.scheduleService.removeLesson(id);
  }
}
