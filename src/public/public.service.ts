import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StudentStatus, TeacherStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { CoursesService } from '../courses/courses.service';
import { QueryCoursesDto } from '../courses/dto/query-courses.dto';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
  ) {}

  // ============================================================
  // COURSES
  // ============================================================
  listCourses(q: QueryCoursesDto) {
    return this.coursesService.list(q, { includeAllStatuses: false });
  }

  courseBySlug(slug: string) {
    return this.coursesService.findBySlug(slug, { includeAllStatuses: false });
  }

  // ============================================================
  // TEACHERS (faqat active + ommaviy maydonlar)
  // ============================================================
  async listTeachers(q: PaginationDto) {
    const where: Prisma.TeacherWhereInput = {
      status: TeacherStatus.active,
      user: { deletedAt: null, status: 'active' },
    };
    if (q.search) {
      where.OR = [
        { specialty: { contains: q.search, mode: 'insensitive' } },
        { user: { firstName: { contains: q.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: q.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.teacher.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: { rating: 'desc' },
        select: this.publicTeacherSelect(),
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return paginate(items.map((t) => this.flattenTeacher(t)), total, q.page ?? 1, q.limit ?? 20);
  }

  async teacherById(id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id,
        status: TeacherStatus.active,
        user: { deletedAt: null, status: 'active' },
      },
      select: this.publicTeacherSelect(),
    });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    return this.flattenTeacher(teacher);
  }

  // ============================================================
  // STATS (landing sahifa uchun)
  // ============================================================
  async stats() {
    const [students, teachers, courses] = await this.prisma.$transaction([
      this.prisma.student.count({
        where: {
          status: StudentStatus.active,
          user: { deletedAt: null },
        },
      }),
      this.prisma.teacher.count({
        where: {
          status: TeacherStatus.active,
          user: { deletedAt: null },
        },
      }),
      this.prisma.course.count({ where: { status: 'active' } }),
    ]);

    const graduates = await this.prisma.student.count({
      where: { status: StudentStatus.graduated },
    });

    return { students, teachers, courses, graduates };
  }

  // ============================================================
  // INTERNAL
  // ============================================================
  private publicTeacherSelect() {
    return {
      id: true,
      teacherId: true,
      specialty: true,
      experience: true,
      bio: true,
      rating: true,
      socialLinks: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          middleName: true,
          avatarUrl: true,
        },
      },
    } satisfies Prisma.TeacherSelect;
  }

  private flattenTeacher(t: {
    user: { firstName: string; lastName: string; middleName: string | null; avatarUrl: string | null };
  } & Record<string, unknown>) {
    const { user, ...rest } = t;
    return { ...rest, ...user };
  }
}
