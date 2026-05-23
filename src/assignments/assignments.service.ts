import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, GroupStudentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { QueryAssignmentsDto } from './dto/query-assignments.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // LIST
  // ============================================================
  async list(q: QueryAssignmentsDto) {
    const where: Prisma.AssignmentWhereInput = {};
    if (q.groupId) where.groupId = q.groupId;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.assignment.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: q.sortBy === 'dueDate' ? { dueDate: q.order ?? 'asc' } : { createdAt: q.order ?? 'desc' },
        include: {
          group: { select: { id: true, name: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { submissions: true } },
        },
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  // ============================================================
  // FIND ONE
  // ============================================================
  async findOne(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true, course: { select: { name: true } } } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!assignment) throw new NotFoundException("Vazifa topilmadi");
    return assignment;
  }

  // ============================================================
  // CREATE — guruhdagi barcha active talabalarga pending submission yaratadi
  // ============================================================
  async create(dto: CreateAssignmentDto, createdBy: string) {
    const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException("Guruh topilmadi");

    const activeStudents = await this.prisma.groupStudent.findMany({
      where: { groupId: dto.groupId, status: GroupStudentStatus.active },
      select: { studentId: true },
    });

    return this.prisma.assignment.create({
      data: {
        groupId: dto.groupId,
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        maxScore: dto.maxScore ?? 100,
        createdBy,
        submissions: {
          create: activeStudents.map((s) => ({
            studentId: s.studentId,
            status: AssignmentStatus.pending,
          })),
        },
      },
      include: {
        group: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    });
  }

  // ============================================================
  // UPDATE
  // ============================================================
  async update(id: string, dto: UpdateAssignmentDto) {
    const existing = await this.prisma.assignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Vazifa topilmadi");

    const data: Prisma.AssignmentUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.dueDate !== undefined) data.dueDate = new Date(dto.dueDate);
    if (dto.maxScore !== undefined) data.maxScore = dto.maxScore;

    return this.prisma.assignment.update({
      where: { id },
      data,
      include: { group: { select: { id: true, name: true } } },
    });
  }

  // ============================================================
  // REMOVE (cascade submissions)
  // ============================================================
  async remove(id: string) {
    const existing = await this.prisma.assignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Vazifa topilmadi");
    await this.prisma.assignment.delete({ where: { id } });
    return { message: "Vazifa o'chirildi" };
  }

  // ============================================================
  // LIST GRADES — vazifa uchun barcha talabalar va baholar
  // ============================================================
  async listGrades(assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, title: true, maxScore: true, dueDate: true },
    });
    if (!assignment) throw new NotFoundException("Vazifa topilmadi");

    const submissions = await this.prisma.studentAssignment.findMany({
      where: { assignmentId },
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

    return { assignment, submissions };
  }

  // ============================================================
  // GRADE — bitta talabaga baho qo'yish
  // ============================================================
  async grade(assignmentId: string, studentId: string, dto: GradeSubmissionDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, maxScore: true },
    });
    if (!assignment) throw new NotFoundException("Vazifa topilmadi");

    if (dto.grade > assignment.maxScore) {
      throw new BadRequestException(
        `Baho maxScore (${assignment.maxScore})'dan oshmasligi kerak`,
      );
    }

    const existing = await this.prisma.studentAssignment.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });

    if (existing) {
      return this.prisma.studentAssignment.update({
        where: { id: existing.id },
        data: { grade: dto.grade, comment: dto.comment, status: AssignmentStatus.graded },
      });
    }

    // Submission mavjud emas (talaba enroll bo'lmagandan keyin yaratilmagan) - yaratamiz
    const inGroup = await this.prisma.groupStudent.findFirst({
      where: { studentId, group: { assignments: { some: { id: assignmentId } } } },
    });
    if (!inGroup) {
      throw new BadRequestException("Talaba bu vazifa guruhida emas");
    }

    return this.prisma.studentAssignment.create({
      data: {
        assignmentId,
        studentId,
        grade: dto.grade,
        comment: dto.comment,
        status: AssignmentStatus.graded,
      },
    });
  }

  // ============================================================
  // STUDENT GRADES — talaba bo'yicha barcha baholar
  // ============================================================
  async studentGrades(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException("Talaba topilmadi");

    const assignments = await this.prisma.studentAssignment.findMany({
      where: { studentId },
      orderBy: { assignment: { dueDate: 'desc' } },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            maxScore: true,
            dueDate: true,
            group: { select: { id: true, name: true, course: { select: { name: true } } } },
          },
        },
      },
    });

    return assignments;
  }
}
