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

import { InstructorsService } from './instructors.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { QueryInstructorsDto } from './dto/query-instructors.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { AVATAR_OPTIONS, buildMulterOptions, fileToUrl } from '../common/utils/multer.config';

@ApiTags('Admin · Instructors')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/instructors')
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Get()
  @ApiOperation({ summary: "O'qituvchilar ro'yxati" })
  list(@Query() q: QueryInstructorsDto) {
    return this.instructorsService.list(q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Yangi o'qituvchi qo'shish" })
  create(@Body() dto: CreateInstructorDto) {
    return this.instructorsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: "O'qituvchi profili (kurslari bilan)" })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.instructorsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "O'qituvchi ma'lumotlarini yangilash" })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInstructorDto,
  ) {
    return this.instructorsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "O'qituvchini o'chirish (soft delete)" })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.instructorsService.remove(id);
  }

  @Post(':id/avatar')
  @ApiOperation({ summary: 'Avatar yuklash' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', buildMulterOptions(AVATAR_OPTIONS)))
  uploadAvatar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error("Fayl yuklanmadi");
    return this.instructorsService.setAvatar(id, fileToUrl(file, AVATAR_OPTIONS.subDir));
  }
}
