import { Module } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import {
  AdminEnrollmentsController,
  EnrollmentsController,
} from './enrollments.controller';

@Module({
  controllers: [EnrollmentsController, AdminEnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
