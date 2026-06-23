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

  // ===== INSTRUCTORS =====
  @Get('instructors')
  @ApiOperation({ summary: "Faol o'qituvchilar ro'yxati" })
  listInstructors(@Query() q: PaginationDto) {
    return this.publicService.listInstructors(q);
  }

  @Get('instructors/:id')
  @ApiOperation({ summary: "O'qituvchi profili (kurslari bilan)" })
  instructorById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.publicService.instructorById(id);
  }

  // ===== STATS =====
  @Get('stats')
  @ApiOperation({ summary: 'Landing statistikasi (students, graduates, instructors, courses, certificates)' })
  stats() {
    return this.publicService.stats();
  }

  // ===== TESTIMONIALS =====
  @Get('testimonials')
  @ApiOperation({ summary: 'Talabalar fikri (barcha tasdiqlangan sharhlar)' })
  testimonials(@Query('limit') limit?: string) {
    return this.publicService.testimonials(limit ? parseInt(limit, 10) : 9);
  }
}
