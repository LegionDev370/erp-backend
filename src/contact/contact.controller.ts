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

import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { QueryContactDto } from './dto/query-contact.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Public · Contact')
@Public()
@Controller('public/contact')
export class PublicContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Aloqa formasini yuborish' })
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }
}

@ApiTags('Admin · Contact')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/contact')
export class AdminContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'Murojaatlar (filter: status, search)' })
  list(@Query() q: QueryContactDto) {
    return this.contactService.list(q, q.status);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Murojaat holatini o\'zgartirish (new/read/replied)' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateContactStatusDto,
  ) {
    return this.contactService.updateStatus(id, dto);
  }
}
