import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import {
  AdminCertificatesController,
  CertificatesController,
} from './certificates.controller';

@Module({
  controllers: [CertificatesController, AdminCertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
