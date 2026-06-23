import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';

import { EnrollmentsService } from './enrollments.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Student · Enrollments')
@ApiBearerAuth('access-token')
@Controller('student/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('checkout')
  @Roles('student')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Kursni sotib olish (to'lov + kursga yozilish)" })
  checkout(@CurrentUser('sub') userId: string, @Body() dto: CheckoutDto) {
    return this.enrollmentsService.checkout(userId, dto);
  }

  @Get()
  @Roles('student')
  @ApiOperation({ summary: 'Mening kurslarim (progress bilan)' })
  myCourses(@CurrentUser('sub') userId: string) {
    return this.enrollmentsService.myCourses(userId);
  }

  @Get(':courseId')
  @Roles('student')
  @ApiOperation({ summary: 'Kurs ichki ko\'rinishi (modullar, darslar, progress)' })
  myCourseDetail(
    @CurrentUser('sub') userId: string,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.enrollmentsService.myCourseDetail(userId, courseId);
  }
}

@ApiTags('Admin · Enrollments')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/enrollments')
export class AdminEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha yozilishlar (filter: courseId, status)' })
  list(
    @Query('courseId') courseId?: string,
    @Query('status') status?: EnrollmentStatus,
  ) {
    return this.enrollmentsService.list(courseId, status);
  }
}
