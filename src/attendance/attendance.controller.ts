import {
  Body,
  Controller,
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

import { AttendanceService } from './attendance.service';
import { BulkSaveAttendanceDto } from './dto/bulk-save-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin · Attendance')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: "Davomat ro'yxati (groupId + ixtiyoriy date)" })
  list(@Query() q: QueryAttendanceDto) {
    return this.attendanceService.list(q);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bulk save: bir darsga barcha talabalar uchun davomat (upsert)" })
  bulkSave(@Body() dto: BulkSaveAttendanceDto, @CurrentUser('sub') userId: string) {
    return this.attendanceService.bulkSave(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Bitta yozuvni yangilash' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.attendanceService.update(id, dto, userId);
  }
}
