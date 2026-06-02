import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [AttendanceModule, AssignmentsModule, PaymentsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
