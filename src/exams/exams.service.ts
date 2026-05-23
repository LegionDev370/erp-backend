import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExamStatus, GroupStudentStatus, Prisma, StudentExamStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamsDto } from './dto/query-exams.dto';
import { GradeExamDto } from './dto/grade-exam.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: QueryExamsDto) {
    const where: Prisma.ExamWhereInput = {};
    if (q.groupId) where.groupId = q.groupId;
    if (q.status) where.status = q.status;
    if (q.search) {
      where.title = { contains: q.search, mode: 'insensitive' };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.exam.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: q.sortBy === 'date' ? { date: q.order ?? 'desc' } : { createdAt: q.order ?? 'desc' },
        include: {
          group: { select: { id: true, name: true } },
          _count: { select: { results: true } },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true, course: { select: { name: true } } } },
      },
    });
    if (!exam) throw new NotFoundException("Imtihon topilmadi");
    return exam;
  }

  async create(dto: CreateExamDto) {
    const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException("Guruh topilmadi");

    const activeStudents = await this.prisma.groupStudent.findMany({
      where: { groupId: dto.groupId, status: GroupStudentStatus.active },
      select: { studentId: true },
    });

    return this.prisma.exam.create({
      data: {
        groupId: dto.groupId,
        title: dto.title,
        date: new Date(dto.date),
        durationMinutes: dto.durationMinutes ?? 60,
        questionsCount: dto.questionsCount ?? 0,
        maxScore: dto.maxScore ?? 100,
        status: dto.status ?? ExamStatus.upcoming,
        results: {
          create: activeStudents.map((s) => ({
            studentId: s.studentId,
            status: StudentExamStatus.pending,
          })),
        },
      },
      include: {
        group: { select: { id: true, name: true } },
        _count: { select: { results: true } },
      },
    });
  }

  async update(id: string, dto: UpdateExamDto) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Imtihon topilmadi");

    const data: Prisma.ExamUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    if (dto.questionsCount !== undefined) data.questionsCount = dto.questionsCount;
    if (dto.maxScore !== undefined) data.maxScore = dto.maxScore;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.exam.update({
      where: { id },
      data,
      include: { group: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Imtihon topilmadi");
    await this.prisma.exam.delete({ where: { id } });
    return { message: "Imtihon o'chirildi" };
  }

  // ============================================================
  // GRADES
  // ============================================================
  async listGrades(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, title: true, maxScore: true, date: true },
    });
    if (!exam) throw new NotFoundException("Imtihon topilmadi");

    const results = await this.prisma.studentExam.findMany({
      where: { examId },
      orderBy: { student: { user: { lastName: 'asc' } } },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    return { exam, results };
  }

  async grade(examId: string, studentId: string, dto: GradeExamDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, maxScore: true },
    });
    if (!exam) throw new NotFoundException("Imtihon topilmadi");

    if (dto.grade > exam.maxScore) {
      throw new BadRequestException(
        `Baho maxScore (${exam.maxScore})'dan oshmasligi kerak`,
      );
    }

    const existing = await this.prisma.studentExam.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });

    const status = dto.status ?? StudentExamStatus.completed;
    const completedAt = status === StudentExamStatus.completed ? new Date() : null;

    if (existing) {
      return this.prisma.studentExam.update({
        where: { id: existing.id },
        data: { grade: dto.grade, comment: dto.comment, status, completedAt },
      });
    }

    const inGroup = await this.prisma.groupStudent.findFirst({
      where: { studentId, group: { exams: { some: { id: examId } } } },
    });
    if (!inGroup) {
      throw new BadRequestException("Talaba bu imtihon guruhida emas");
    }

    return this.prisma.studentExam.create({
      data: {
        examId,
        studentId,
        grade: dto.grade,
        comment: dto.comment,
        status,
        completedAt,
      },
    });
  }
}
