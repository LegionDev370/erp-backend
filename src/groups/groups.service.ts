import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupStudentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { QueryGroupsDto } from './dto/query-groups.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // LIST
  // ============================================================
  async list(q: QueryGroupsDto) {
    const where: Prisma.GroupWhereInput = {};
    if (q.courseId) where.courseId = q.courseId;
    if (q.teacherId) where.teacherId = q.teacherId;
    if (q.status) where.status = q.status;
    if (q.format) where.format = q.format;
    if (q.room) where.room = { contains: q.room, mode: 'insensitive' };
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { course: { name: { contains: q.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.GroupOrderByWithRelationInput =
      q.sortBy === 'startDate'
        ? { startDate: q.order ?? 'desc' }
        : q.sortBy === 'name'
          ? { name: q.order ?? 'asc' }
          : { createdAt: q.order ?? 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.group.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy,
        include: this.briefInclude(),
      }),
      this.prisma.group.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  // ============================================================
  // FIND ONE
  // ============================================================
  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: this.fullInclude(),
    });
    if (!group) throw new NotFoundException("Guruh topilmadi");
    return group;
  }

  // ============================================================
  // CREATE
  // ============================================================
  async create(dto: CreateGroupDto) {
    await this.assertCourseAndTeacherExist(dto.courseId, dto.teacherId);

    const dupName = await this.prisma.group.findUnique({ where: { name: dto.name } });
    if (dupName) throw new ConflictException("Bunday nomli guruh allaqachon mavjud");

    return this.prisma.group.create({
      data: {
        name: dto.name,
        courseId: dto.courseId,
        teacherId: dto.teacherId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status ?? 'upcoming',
        maxStudents: dto.maxStudents ?? 20,
        room: dto.room,
        format: dto.format ?? 'offline',
        scheduleDays: dto.scheduleDays,
        scheduleTime: dto.scheduleTime,
        monthlyPrice: dto.monthlyPrice,
      },
      include: this.fullInclude(),
    });
  }

  // ============================================================
  // UPDATE
  // ============================================================
  async update(id: string, dto: UpdateGroupDto) {
    const existing = await this.prisma.group.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Guruh topilmadi");

    if (dto.courseId || dto.teacherId) {
      await this.assertCourseAndTeacherExist(
        dto.courseId ?? existing.courseId,
        dto.teacherId ?? existing.teacherId,
      );
    }

    if (dto.name && dto.name !== existing.name) {
      const dupName = await this.prisma.group.findUnique({ where: { name: dto.name } });
      if (dupName) throw new ConflictException("Bunday nomli guruh allaqachon mavjud");
    }

    if (dto.maxStudents !== undefined && dto.maxStudents < existing.currentStudents) {
      throw new BadRequestException(
        `maxStudents (${dto.maxStudents}) joriy talabalar sonidan (${existing.currentStudents}) kichik bo'la olmaydi`,
      );
    }

    const data: Prisma.GroupUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.courseId !== undefined) data.course = { connect: { id: dto.courseId } };
    if (dto.teacherId !== undefined) data.teacher = { connect: { id: dto.teacherId } };
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.maxStudents !== undefined) data.maxStudents = dto.maxStudents;
    if (dto.room !== undefined) data.room = dto.room;
    if (dto.format !== undefined) data.format = dto.format;
    if (dto.scheduleDays !== undefined) data.scheduleDays = dto.scheduleDays;
    if (dto.scheduleTime !== undefined) data.scheduleTime = dto.scheduleTime;
    if (dto.monthlyPrice !== undefined) data.monthlyPrice = dto.monthlyPrice;

    return this.prisma.group.update({
      where: { id },
      data,
      include: this.fullInclude(),
    });
  }

  // ============================================================
  // REMOVE
  // ============================================================
  async remove(id: string) {
    const existing = await this.prisma.group.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Guruh topilmadi");
    await this.prisma.group.delete({ where: { id } });
    return { message: "Guruh o'chirildi" };
  }

  // ============================================================
  // ENROLL STUDENT
  // ============================================================
  async enrollStudent(groupId: string, studentId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException("Guruh topilmadi");

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { deletedAt: true } } },
    });
    if (!student || student.user.deletedAt) {
      throw new NotFoundException("Talaba topilmadi");
    }

    if (group.currentStudents >= group.maxStudents) {
      throw new BadRequestException(
        `Guruhda joy yo'q (${group.currentStudents}/${group.maxStudents})`,
      );
    }

    const existing = await this.prisma.groupStudent.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });

    if (existing && existing.status === GroupStudentStatus.active) {
      throw new ConflictException("Talaba allaqachon guruhda");
    }

    return this.prisma.$transaction(async (tx) => {
      const enrollment = existing
        ? await tx.groupStudent.update({
            where: { groupId_studentId: { groupId, studentId } },
            data: { status: GroupStudentStatus.active, leftAt: null, enrolledAt: new Date() },
          })
        : await tx.groupStudent.create({
            data: { groupId, studentId, status: GroupStudentStatus.active },
          });

      await tx.group.update({
        where: { id: groupId },
        data: { currentStudents: { increment: 1 } },
      });

      return enrollment;
    });
  }

  // ============================================================
  // REMOVE STUDENT (leave)
  // ============================================================
  async removeStudent(groupId: string, studentId: string) {
    const enrollment = await this.prisma.groupStudent.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });
    if (!enrollment) throw new NotFoundException("Talaba bu guruhda emas");
    if (enrollment.status !== GroupStudentStatus.active) {
      throw new BadRequestException("Talaba allaqachon guruhdan chiqarilgan");
    }

    await this.prisma.$transaction([
      this.prisma.groupStudent.update({
        where: { groupId_studentId: { groupId, studentId } },
        data: { status: GroupStudentStatus.left, leftAt: new Date() },
      }),
      this.prisma.group.update({
        where: { id: groupId },
        data: { currentStudents: { decrement: 1 } },
      }),
    ]);

    return { message: "Talaba guruhdan chiqarildi" };
  }

  // ============================================================
  // LIST STUDENTS (guruh tarkibi)
  // ============================================================
  async listStudents(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException("Guruh topilmadi");

    const enrollments = await this.prisma.groupStudent.findMany({
      where: { groupId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                email: true,
                phone: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return enrollments.map((e) => ({
      enrolledAt: e.enrolledAt,
      leftAt: e.leftAt,
      enrollmentStatus: e.status,
      studentId: e.student.id,
      studentNumber: e.student.studentId,
      ...e.student.user,
      userId: e.student.user.id,
    }));
  }

  // ============================================================
  // INTERNAL
  // ============================================================
  private briefInclude() {
    return {
      course: { select: { id: true, name: true, slug: true, category: true } },
      teacher: {
        select: {
          id: true,
          teacherId: true,
          specialty: true,
          user: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
      },
    } satisfies Prisma.GroupInclude;
  }

  private fullInclude() {
    return {
      course: { select: { id: true, name: true, slug: true, category: true, level: true } },
      teacher: {
        select: {
          id: true,
          teacherId: true,
          specialty: true,
          rating: true,
          user: {
            select: { firstName: true, lastName: true, avatarUrl: true, email: true, phone: true },
          },
        },
      },
      _count: { select: { students: { where: { status: GroupStudentStatus.active } }, lessons: true } },
    } satisfies Prisma.GroupInclude;
  }

  private async assertCourseAndTeacherExist(courseId: string, teacherId: string) {
    const [course, teacher] = await this.prisma.$transaction([
      this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }),
      this.prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { id: true, user: { select: { deletedAt: true } } },
      }),
    ]);
    if (!course) throw new NotFoundException("Kurs topilmadi");
    if (!teacher || teacher.user.deletedAt) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }
  }
}
