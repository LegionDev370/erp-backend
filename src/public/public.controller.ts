import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PublicService } from './public.service';
import { Public } from '../common/decorators/public.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { QueryCoursesDto } from '../courses/dto/query-courses.dto';

@ApiTags('Public')
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // ===== COURSES =====
  @Get('courses')
  @ApiOperation({ summary: 'Faol kurslar ro\'yxati' })
  listCourses(@Query() q: QueryCoursesDto) {
    return this.publicService.listCourses(q);
  }

  @Get('courses/:slug')
  @ApiOperation({ summary: 'Kurs tafsiloti (slug bo\'yicha)' })
  courseBySlug(@Param('slug') slug: string) {
    return this.publicService.courseBySlug(slug);
  }

  // ===== TEACHERS =====
  @Get('teachers')
  @ApiOperation({ summary: 'Faol o\'qituvchilar ro\'yxati' })
  listTeachers(@Query() q: PaginationDto) {
    return this.publicService.listTeachers(q);
  }

  @Get('teachers/:id')
  @ApiOperation({ summary: 'O\'qituvchi profili (ommaviy)' })
  teacherById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.publicService.teacherById(id);
  }

  // ===== STATS =====
  @Get('stats')
  @ApiOperation({ summary: 'Landing sahifa uchun statistika' })
  stats() {
    return this.publicService.stats();
  }
}
