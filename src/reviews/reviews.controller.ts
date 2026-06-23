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

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Student · Reviews')
@ApiBearerAuth('access-token')
@Controller('student/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles('student')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Kursga sharh qoldirish (moderatsiyaga tushadi)' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  @Get('mine')
  @Roles('student')
  @ApiOperation({ summary: 'Mening sharhlarim' })
  myReviews(@CurrentUser('sub') userId: string) {
    return this.reviewsService.myReviews(userId);
  }
}

@ApiTags('Admin · Reviews')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Sharhlar (moderatsiya navbati, filter: status)' })
  list(@Query() q: QueryReviewsDto) {
    return this.reviewsService.list(q, q.status);
  }

  @Patch(':id/moderate')
  @ApiOperation({ summary: 'Sharhni tasdiqlash / rad etish' })
  moderate(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ModerateReviewDto) {
    return this.reviewsService.moderate(id, dto);
  }
}
