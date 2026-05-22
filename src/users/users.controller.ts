import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "O'z parolini o'zgartirish" })
  changePassword(@CurrentUser('sub') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Faol sessiyalar ro\'yxati' })
  listSessions(@CurrentUser('sub') userId: string) {
    return this.usersService.listSessions(userId);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Boshqa sessiyani tugatish' })
  revokeSession(@CurrentUser('sub') userId: string, @Param('id') sessionId: string) {
    return this.usersService.revokeSession(userId, sessionId);
  }
}
