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

import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeachersDto } from './dto/query-teachers.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { AVATAR_OPTIONS, buildMulterOptions, fileToUrl } from '../common/utils/multer.config';

@ApiTags('Admin · Teachers')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @ApiOperation({ summary: 'O\'qituvchilar ro\'yxati' })
  list(@Query() q: QueryTeachersDto) {
    return this.teachersService.list(q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi o\'qituvchi qo\'shish' })
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'O\'qituvchi profili' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.teachersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'O\'qituvchi ma\'lumotlarini yangilash' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'O\'qituvchini o\'chirish (soft delete)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.teachersService.remove(id);
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
    return this.teachersService.setAvatar(id, fileToUrl(file, AVATAR_OPTIONS.subDir));
  }
}
