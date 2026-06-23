
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { paginate } from '../common/dto/pagination.dto';

interface ListOpts {
  /** Public API false bersa, faqat status=active kurslar qaytadi */
  includeAllStatuses?: boolean;
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: QueryCoursesDto, opts: ListOpts = {}) {
    const where: Prisma.CourseWhereInput = {};
    if (opts.includeAllStatuses) {
      if (q.status) where.status = q.status;
    } else {
      where.status = CourseStatus.active;
    }
    if (q.category) where.category = q.category;
    if (q.level) where.level = q.level;
    if (q.featured !== undefined) where.isFeatured = q.featured;
    if (q.priceMin !== undefined || q.priceMax !== undefined) {
      where.price = {};
      if (q.priceMin !== undefined) where.price.gte = q.priceMin;
      if (q.priceMax !== undefined) where.price.lte = q.priceMax;
    }
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
        { category: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CourseOrderByWithRelationInput =
      q.sortBy === 'price'
        ? { price: q.order ?? 'asc' }
        : q.sortBy === 'rating'
          ? { rating: q.order ?? 'desc' }
          : q.sortBy === 'name'
            ? { name: q.order ?? 'asc' }
            : { createdAt: q.order ?? 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy,
      }),
      this.prisma.course.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: this.fullInclude(),
    });
    if (!course) throw new NotFoundException("Kurs topilmadi");
    return course;
  }

  async findBySlug(slug: string, opts: ListOpts = {}) {
    const where: Prisma.CourseWhereInput = { slug };
    if (!opts.includeAllStatuses) where.status = CourseStatus.active;

    const course = await this.prisma.course.findFirst({
      where,
      include: this.fullInclude(),
    });
    if (!course) throw new NotFoundException("Kurs topilmadi");
    return course;
  }

  async create(dto: CreateCourseDto) {
    const dup = await this.prisma.course.findUnique({ where: { slug: dto.slug } });
    if (dup) throw new ConflictException("Bunday slug bilan kurs allaqachon mavjud");

    const lessonsCount =
      dto.lessonsCount ??
      (dto.modules?.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0) ?? 0);

    if (dto.instructorId) {
      const instructor = await this.prisma.instructor.findUnique({ where: { id: dto.instructorId } });
      if (!instructor) throw new NotFoundException("O'qituvchi (instructor) topilmadi");
    }

    return this.prisma.course.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        longDescription: dto.longDescription,
        category: dto.category,
        level: dto.level,
        price: dto.price,
        oldPrice: dto.oldPrice,
        durationMonths: dto.durationMonths,
        lessonsCount,
        imageUrl: dto.imageUrl,
        previewVideoUrl: dto.previewVideoUrl,
        instructorId: dto.instructorId,
        isFeatured: dto.isFeatured ?? false,
        status: dto.status ?? 'draft',
        modules: dto.modules?.length
          ? {
              create: dto.modules.map((m) => ({
                title: m.title,
                order: m.order,
                lessons: m.lessons?.length
                  ? {
                      create: m.lessons.map((l) => ({
                        title: l.title,
                        durationMinutes: l.durationMinutes,
                        order: l.order,
                        videoUrl: l.videoUrl,
                        content: l.content,
                        isPreview: l.isPreview ?? false,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: this.fullInclude(),
    });
  }

  async update(id: string, dto: UpdateCourseDto) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Kurs topilmadi");

    if (dto.slug && dto.slug !== existing.slug) {
      const dup = await this.prisma.course.findUnique({ where: { slug: dto.slug } });
      if (dup) throw new ConflictException("Bunday slug bilan kurs allaqachon mavjud");
    }

    // Modullarni alohida boshqaramiz — agar dto.modules berilgan bo'lsa
    // eskilarini o'chirib, yangilarini yaratamiz (replace strategy).
    const data: Prisma.CourseUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.longDescription !== undefined) data.longDescription = dto.longDescription;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.oldPrice !== undefined) data.oldPrice = dto.oldPrice;
    if (dto.durationMonths !== undefined) data.durationMonths = dto.durationMonths;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.previewVideoUrl !== undefined) data.previewVideoUrl = dto.previewVideoUrl;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.instructorId !== undefined) {
      data.instructor = dto.instructorId
        ? { connect: { id: dto.instructorId } }
        : { disconnect: true };
    }

    if (dto.modules !== undefined) {
      const lessonsCount =
        dto.lessonsCount ?? dto.modules.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0);
      data.lessonsCount = lessonsCount;
    } else if (dto.lessonsCount !== undefined) {
      data.lessonsCount = dto.lessonsCount;
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.modules !== undefined) {
        // Replace: eski modullar va dars yozuvlari (cascade) o'chadi
        await tx.courseModule.deleteMany({ where: { courseId: id } });
        await tx.course.update({
          where: { id },
          data: {
            modules: {
              create: dto.modules.map((m) => ({
                title: m.title,
                order: m.order,
                lessons: m.lessons?.length
                  ? {
                      create: m.lessons.map((l) => ({
                        title: l.title,
                        durationMinutes: l.durationMinutes,
                        order: l.order,
                        videoUrl: l.videoUrl,
                        content: l.content,
                        isPreview: l.isPreview ?? false,
                      })),
                    }
                  : undefined,
              })),
            },
          },
        });
      }

      return tx.course.update({
        where: { id },
        data,
        include: this.fullInclude(),
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Kurs topilmadi");
    await this.prisma.course.delete({ where: { id } });
    return { message: "Kurs o'chirildi" };
  }

  private fullInclude() {
    return {
      instructor: {
        select: {
          id: true,
          specialty: true,
          rating: true,
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      },
      modules: {
        orderBy: { order: 'asc' as const },
        include: {
          lessons: {
            orderBy: { order: 'asc' as const },
          },
        },
      },
    } satisfies Prisma.CourseInclude;
  }
}
