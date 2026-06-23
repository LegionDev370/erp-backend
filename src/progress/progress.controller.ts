import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Student · Progress')
@ApiBearerAuth('access-token')
@Roles('student')
@Controller('student/lessons')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post(':lessonId/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Darsni tugatildi/ko'rildi deb belgilash" })
  markLesson(
    @CurrentUser('sub') userId: string,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.progressService.markLesson(userId, lessonId, dto);
  }
}
