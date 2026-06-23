import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // Darsni "ko'rilgan / tugatilgan" deb belgilash + progress recompute
  // ============================================================
  async markLesson(userId: string, lessonId: string, dto: UpdateProgressDto) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new BadRequestException("Faqat talaba hisobi uchun");

    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });
    if (!lesson) throw new NotFoundException("Dars topilmadi");

    const courseId = lesson.module.courseId;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId } },
    });
    if (!enrollment) throw new BadRequestException("Siz bu kursga yozilmagansiz");

    const completed = dto.completed ?? true;

    await this.prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: student.id, lessonId } },
      update: {
        completed,
        watchedSeconds: dto.watchedSeconds ?? undefined,
        completedAt: completed ? new Date() : null,
      },
      create: {
        studentId: student.id,
        lessonId,
        completed,
        watchedSeconds: dto.watchedSeconds ?? 0,
        completedAt: completed ? new Date() : null,
      },
    });

    return this.recomputeProgress(student.id, courseId, lessonId);
  }

  // ============================================================
  // Kurs progressini qayta hisoblash (cached % + completed holati)
  // ============================================================
  private async recomputeProgress(studentId: string, courseId: string, lastLessonId: string) {
    const totalLessons = await this.prisma.courseLesson.count({
      where: { module: { courseId } },
    });
    const completedLessons = await this.prisma.lessonProgress.count({
      where: { studentId, completed: true, lesson: { module: { courseId } } },
    });

    const percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    const isComplete = totalLessons > 0 && completedLessons >= totalLessons;

    const enrollment = await this.prisma.enrollment.update({
      where: { studentId_courseId: { studentId, courseId } },
      data: {
        progress: percent,
        lastViewedLessonId: lastLessonId,
        status: isComplete ? 'completed' : 'active',
        completedAt: isComplete ? new Date() : null,
      },
    });

    return {
      progress: percent,
      completedLessons,
      totalLessons,
      status: enrollment.status,
    };
  }
}
