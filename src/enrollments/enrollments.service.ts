import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, PaymentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CHECKOUT — talaba kursni sotib oladi (to'lov + enrollment)
  // ============================================================
  async checkout(userId: string, dto: CheckoutDto) {
    const student = await this.resolveStudent(userId);

    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course || course.status !== CourseStatus.active) {
      throw new NotFoundException("Kurs topilmadi yoki faol emas");
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
    });
    if (existing && (existing.status === 'active' || existing.status === 'completed')) {
      throw new ConflictException("Siz bu kursga allaqachon yozilgansiz");
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          amount: course.price,
          method: dto.method,
          status: PaymentStatus.paid,
          paidAt: new Date(),
          transactionId: dto.transactionId,
        },
      });

      const enrollment = await tx.enrollment.upsert({
        where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
        update: { status: 'active', progress: 0, enrolledAt: new Date(), completedAt: null },
        create: { studentId: student.id, courseId: course.id, status: 'active' },
        include: { course: { select: { id: true, name: true, slug: true, imageUrl: true } } },
      });

      if (!existing) {
        await tx.course.update({
          where: { id: course.id },
          data: { studentsCount: { increment: 1 } },
        });
      }

      return { enrollment, payment: { id: payment.id, amount: payment.amount, status: payment.status } };
    });
  }

  // ============================================================
  // MY COURSES — talabaning yozilgan kurslari
  // ============================================================
  async myCourses(userId: string) {
    const student = await this.resolveStudent(userId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: student.id, status: { in: ['active', 'completed'] } },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            category: true,
            lessonsCount: true,
            instructor: {
              select: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    return enrollments;
  }

  // ============================================================
  // MY COURSE DETAIL — modullar + darslar + progress holati
  // ============================================================
  async myCourseDetail(userId: string, courseId: string) {
    const student = await this.resolveStudent(userId);

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId } },
    });
    if (!enrollment) throw new NotFoundException("Siz bu kursga yozilmagansiz");

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: {
          select: {
            specialty: true,
            user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!course) throw new NotFoundException("Kurs topilmadi");

    const progress = await this.prisma.lessonProgress.findMany({
      where: { studentId: student.id, lesson: { module: { courseId } } },
      select: { lessonId: true, completed: true, watchedSeconds: true },
    });
    const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

    const modules = course.modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => ({
        ...l,
        completed: progressMap.get(l.id)?.completed ?? false,
        watchedSeconds: progressMap.get(l.id)?.watchedSeconds ?? 0,
      })),
    }));

    return {
      enrollment: {
        status: enrollment.status,
        progress: enrollment.progress,
        lastViewedLessonId: enrollment.lastViewedLessonId,
        completedAt: enrollment.completedAt,
      },
      course: { ...course, modules },
    };
  }

  // ============================================================
  // ADMIN — bitta talabaning enrollmentlari (student.id bo'yicha)
  // ============================================================
  async studentEnrollments(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException("Talaba topilmadi");

    return this.prisma.enrollment.findMany({
      where: { studentId },
      orderBy: { enrolledAt: 'desc' },
      include: { course: { select: { id: true, name: true, slug: true, imageUrl: true } } },
    });
  }

  // ============================================================
  // ADMIN — barcha enrollmentlar (filter: courseId, status)
  // ============================================================
  async list(courseId?: string, status?: Prisma.EnumEnrollmentStatusFilter['equals']) {
    const where: Prisma.EnrollmentWhereInput = {};
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;

    return this.prisma.enrollment.findMany({
      where,
      orderBy: { enrolledAt: 'desc' },
      take: 200,
      include: {
        course: { select: { id: true, name: true } },
        student: {
          select: { studentId: true, user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
  }

  // ============================================================
  // INTERNAL
  // ============================================================
  private async resolveStudent(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) {
      throw new BadRequestException("Faqat talaba hisobi kurslarga yozila oladi");
    }
    return student;
  }
}
