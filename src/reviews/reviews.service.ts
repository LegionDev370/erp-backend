import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // STUDENT — sharh qoldirish (yozilgan kurs uchun)
  // ============================================================
  async create(userId: string, dto: CreateReviewDto) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new BadRequestException("Faqat talaba hisobi uchun");

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: dto.courseId } },
    });
    if (!enrollment) throw new BadRequestException("Faqat yozilgan kursga sharh qoldirish mumkin");

    const review = await this.prisma.review.upsert({
      where: { courseId_studentId: { courseId: dto.courseId, studentId: student.id } },
      update: { rating: dto.rating, text: dto.text, status: ReviewStatus.pending },
      create: {
        courseId: dto.courseId,
        studentId: student.id,
        rating: dto.rating,
        text: dto.text,
      },
    });

    return review;
  }

  async myReviews(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new BadRequestException("Faqat talaba hisobi uchun");
    return this.prisma.review.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { id: true, name: true } } },
    });
  }

  // ============================================================
  // ADMIN — moderatsiya navbati
  // ============================================================
  async list(q: PaginationDto, status?: ReviewStatus) {
    const where: Prisma.ReviewWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { id: true, name: true } },
          student: {
            select: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  async moderate(id: string, dto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException("Sharh topilmadi");

    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: dto.status },
    });

    // Tasdiqlangan/rad etilgan sharhlar kurs reytingiga ta'sir qiladi
    await this.recomputeCourseRating(review.courseId);

    return updated;
  }

  // ============================================================
  // INTERNAL — kurs reytingini (tasdiqlangan sharhlar bo'yicha) yangilash
  // ============================================================
  private async recomputeCourseRating(courseId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { courseId, status: ReviewStatus.approved },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await this.prisma.course.update({
      where: { id: courseId },
      data: {
        rating: agg._avg.rating ?? 0,
        ratingCount: agg._count._all,
      },
    });
  }
}
