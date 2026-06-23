import { Injectable, NotFoundException } from '@nestjs/common';
import { InstructorStatus, Prisma, ReviewStatus, StudentStatus } from '@prisma/client';

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

  async courseBySlug(slug: string) {
    const course = await this.coursesService.findBySlug(slug, { includeAllStatuses: false });

    const reviews = await this.prisma.review.findMany({
      where: { courseId: course.id, status: ReviewStatus.approved },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        rating: true,
        text: true,
        createdAt: true,
        student: {
          select: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    });

    return { ...course, reviews };
  }

  // ============================================================
  // INSTRUCTORS (faqat active + ommaviy maydonlar)
  // ============================================================
  async listInstructors(q: PaginationDto) {
    const where: Prisma.InstructorWhereInput = {
      status: InstructorStatus.active,
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
      this.prisma.instructor.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: { rating: 'desc' },
        select: this.publicInstructorSelect(),
      }),
      this.prisma.instructor.count({ where }),
    ]);

    return paginate(items.map((t) => this.flattenInstructor(t)), total, q.page ?? 1, q.limit ?? 20);
  }

  async instructorById(id: string) {
    const instructor = await this.prisma.instructor.findFirst({
      where: {
        id,
        status: InstructorStatus.active,
        user: { deletedAt: null, status: 'active' },
      },
      select: {
        ...this.publicInstructorSelect(),
        courses: {
          where: { status: 'active' },
          select: { id: true, name: true, slug: true, imageUrl: true, rating: true, studentsCount: true },
        },
      },
    });
    if (!instructor) throw new NotFoundException("O'qituvchi topilmadi");
    return this.flattenInstructor(instructor);
  }

  // ============================================================
  // STATS (landing sahifa uchun)
  // ============================================================
  async stats() {
    const [students, graduates, instructors, courses, certificates] =
      await this.prisma.$transaction([
        this.prisma.student.count({
          where: { status: StudentStatus.active, user: { deletedAt: null } },
        }),
        this.prisma.student.count({
          where: { status: StudentStatus.graduated, user: { deletedAt: null } },
        }),
        this.prisma.instructor.count({
          where: { status: InstructorStatus.active, user: { deletedAt: null } },
        }),
        this.prisma.course.count({ where: { status: 'active' } }),
        this.prisma.certificate.count({ where: { status: 'issued' } }),
      ]);

    return { students, graduates, instructors, courses, certificates };
  }

  // ============================================================
  // TESTIMONIALS (landing — barcha tasdiqlangan sharhlar)
  // ============================================================
  async testimonials(limit = 9) {
    const take = Math.min(Math.max(limit, 1), 30);
    const reviews = await this.prisma.review.findMany({
      where: { status: ReviewStatus.approved, text: { not: null } },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take,
      select: {
        rating: true,
        text: true,
        createdAt: true,
        course: { select: { id: true, name: true, slug: true } },
        student: {
          select: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    });

    return reviews.map((r) => ({
      rating: r.rating,
      text: r.text,
      createdAt: r.createdAt,
      course: r.course,
      name: `${r.student.user.firstName} ${r.student.user.lastName}`,
      avatarUrl: r.student.user.avatarUrl,
    }));
  }

  // ============================================================
  // INTERNAL
  // ============================================================
  private publicInstructorSelect() {
    return {
      id: true,
      instructorId: true,
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
    } satisfies Prisma.InstructorSelect;
  }

  private flattenInstructor(t: {
    user: { firstName: string; lastName: string; middleName: string | null; avatarUrl: string | null };
  } & Record<string, unknown>) {
    const { user, ...rest } = t;
    return { ...rest, ...user };
  }
}
