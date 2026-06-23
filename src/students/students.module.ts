import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [EnrollmentsModule, PaymentsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
