import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { AssignmentsModule } from '../assignments/assignments.module';

@Module({
  imports: [AttendanceModule, AssignmentsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
