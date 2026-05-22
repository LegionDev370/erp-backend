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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { COURSE_IMAGE_OPTIONS, buildMulterOptions, fileToUrl } from '../common/utils/multer.config';

@ApiTags('Admin · Courses')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Kurslar ro\'yxati (barcha statuslar)' })
  list(@Query() q: QueryCoursesDto) {
    return this.coursesService.list(q, { includeAllStatuses: true });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi kurs yaratish (modullar va darslar bilan)' })
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Kurs tafsiloti (modullar+darslar)' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Kursni yangilash. modules berilsa - eski modullar replace bo\'ladi',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kursni o\'chirish (cascade: modullar+darslar)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.coursesService.remove(id);
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Kurs muqovasini yuklash' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', buildMulterOptions(COURSE_IMAGE_OPTIONS)))
  async uploadImage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error("Fayl yuklanmadi");
    const imageUrl = fileToUrl(file, COURSE_IMAGE_OPTIONS.subDir);
    await this.coursesService.update(id, { imageUrl });
    return { imageUrl };
  }
}
