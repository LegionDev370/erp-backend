import {
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

import { CertificatesService } from './certificates.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Student · Certificates')
@ApiBearerAuth('access-token')
@Controller('student/certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @Roles('student')
  @ApiOperation({ summary: 'Mening sertifikatlarim' })
  myCertificates(@CurrentUser('sub') userId: string) {
    return this.certificatesService.myCertificates(userId);
  }

  @Post('claim/:courseId')
  @Roles('student')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tugatilgan kurs uchun sertifikat olish' })
  claim(
    @CurrentUser('sub') userId: string,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.certificatesService.claim(userId, courseId);
  }
}

@ApiTags('Admin · Certificates')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/certificates')
export class AdminCertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha sertifikatlar (pagination + search)' })
  list(@Query() q: PaginationDto) {
    return this.certificatesService.list(q);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Sertifikatni bekor qilish' })
  revoke(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.certificatesService.revoke(id);
  }
}
