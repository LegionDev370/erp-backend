import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, GroupStudentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { BulkSaveAttendanceDto } from './dto/bulk-save-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto, QueryAttendanceMatrixDto } from './dto/query-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // LIST — groupId + (date?) bo'yicha davomat
  // ============================================================
  async list(q: QueryAttendanceDto) {
    // Faqat shu guruhga tegishli darslarni topamiz
    const lessonWhere: Prisma.LessonWhereInput = { groupId: q.groupId };
    if (q.date) lessonWhere.date = new Date(q.date);

    const lessons = await this.prisma.lesson.findMany({
      where: lessonWhere,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      select: { id: true },
    });
    if (!lessons.length) return [];

    return this.prisma.attendance.findMany({
      where: { lessonId: { in: lessons.map((l) => l.id) } },
      include: {
        lesson: { select: { id: true, date: true, startTime: true, topic: true, room: true } },
        student: {
          select: {
            id: true,
            studentId: true,
            user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: [{ lesson: { date: 'asc' } }, { markedAt: 'asc' }],
    });
  }

  // ============================================================
  // BULK SAVE — bir darsga barcha talabalar uchun davomat
  // ============================================================
  async bulkSave(dto: BulkSaveAttendanceDto, markedBy: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      select: { id: true, groupId: true },
    });
    if (!lesson) throw new NotFoundException("Dars topilmadi");

    // Berilgan talabalar guruh tarkibida (active yoki bir vaqtlar bo'lganmi) ekanligini tekshiramiz
    const groupStudents = await this.prisma.groupStudent.findMany({
      where: {
        groupId: lesson.groupId,
        studentId: { in: dto.entries.map((e) => e.studentId) },
      },
      select: { studentId: true },
    });
    const validStudentIds = new Set(groupStudents.map((g) => g.studentId));

    const invalid = dto.entries.filter((e) => !validStudentIds.has(e.studentId));
    if (invalid.length) {
      throw new BadRequestException(
        `Quyidagi talabalar bu guruhda emas: ${invalid.map((i) => i.studentId).join(', ')}`,
      );
    }

    // Upsert har bir entry uchun (UNIQUE(lessonId, studentId))
    const results = await this.prisma.$transaction(
      dto.entries.map((e) =>
        this.prisma.attendance.upsert({
          where: { lessonId_studentId: { lessonId: dto.lessonId, studentId: e.studentId } },
          create: {
            lessonId: dto.lessonId,
            studentId: e.studentId,
            status: e.status,
            note: e.note,
            markedBy,
          },
          update: {
            status: e.status,
            note: e.note,
            markedBy,
            markedAt: new Date(),
          },
        }),
      ),
    );

    return { count: results.length, items: results };
  }

  // ============================================================
  // UPDATE bitta yozuv
  // ============================================================
  async update(id: string, dto: UpdateAttendanceDto, markedBy: string) {
    const existing = await this.prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Davomat yozuvi topilmadi");

    return this.prisma.attendance.update({
      where: { id },
      data: {
        status: dto.status,
        note: dto.note,
        markedBy,
        markedAt: new Date(),
      },
    });
  }

  // ============================================================
  // ATTENDANCE MATRIX — guruh uchun talaba×dars matritsasi
  // ============================================================
  async matrix(groupId: string, q: QueryAttendanceMatrixDto) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException("Guruh topilmadi");

    const lessonWhere: Prisma.LessonWhereInput = { groupId };
    if (q.from || q.to) {
      lessonWhere.date = {};
      if (q.from) lessonWhere.date.gte = new Date(q.from);
      if (q.to) lessonWhere.date.lte = new Date(q.to);
    }

    const [lessons, students] = await this.prisma.$transaction([
      this.prisma.lesson.findMany({
        where: lessonWhere,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        select: { id: true, date: true, startTime: true, topic: true },
      }),
      this.prisma.groupStudent.findMany({
        where: { groupId, status: GroupStudentStatus.active },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    const lessonIds = lessons.map((l) => l.id);
    const attendances = await this.prisma.attendance.findMany({
      where: { lessonId: { in: lessonIds } },
      select: { lessonId: true, studentId: true, status: true, note: true },
    });

    // Map: studentId → (lessonId → status)
    const byStudent = new Map<string, Map<string, { status: AttendanceStatus; note: string | null }>>();
    for (const a of attendances) {
      if (!byStudent.has(a.studentId)) byStudent.set(a.studentId, new Map());
      byStudent.get(a.studentId)!.set(a.lessonId, { status: a.status, note: a.note });
    }

    return {
      group: { id: group.id, name: group.name },
      lessons,
      rows: students.map((gs) => ({
        studentId: gs.student.id,
        studentNumber: gs.student.studentId,
        firstName: gs.student.user.firstName,
        lastName: gs.student.user.lastName,
        cells: lessons.map((l) => byStudent.get(gs.student.id)?.get(l.id) ?? null),
      })),
    };
  }

  // ============================================================
  // STUDENT HISTORY — bitta talaba uchun butun davomat tarixi
  // ============================================================
  async studentHistory(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException("Talaba topilmadi");

    const records = await this.prisma.attendance.findMany({
      where: { studentId },
      orderBy: { lesson: { date: 'desc' } },
      include: {
        lesson: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            topic: true,
            room: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    const stats = {
      total: records.length,
      present: records.filter((r) => r.status === AttendanceStatus.present).length,
      late: records.filter((r) => r.status === AttendanceStatus.late).length,
      absent: records.filter((r) => r.status === AttendanceStatus.absent).length,
    };

    return { stats, items: records };
  }
}
