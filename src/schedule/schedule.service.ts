import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LessonStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // GRID — calendar uchun yassi dars ro'yxati
  // ============================================================
  async grid(q: QueryScheduleDto) {
    const where: Prisma.LessonWhereInput = {};
    if (q.from || q.to) {
      where.date = {};
      if (q.from) where.date.gte = new Date(q.from);
      if (q.to) where.date.lte = new Date(q.to);
    }
    if (q.groupId) where.groupId = q.groupId;
    if (q.teacherId) where.group = { teacherId: q.teacherId };
    if (q.room) where.room = { contains: q.room, mode: 'insensitive' };
    if (q.status) where.status = q.status;

    const lessons = await this.prisma.lesson.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: this.lessonInclude(),
    });

    return lessons;
  }

  // ============================================================
  // ROOMS — xonalar holati (band/bo'sh kunlar bo'yicha)
  // ============================================================
  async rooms(q: QueryScheduleDto) {
    const where: Prisma.LessonWhereInput = {
      room: { not: null },
      status: { not: LessonStatus.cancelled },
    };
    if (q.from || q.to) {
      where.date = {};
      if (q.from) where.date.gte = new Date(q.from);
      if (q.to) where.date.lte = new Date(q.to);
    }

    const lessons = await this.prisma.lesson.findMany({
      where,
      orderBy: [{ room: 'asc' }, { date: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        room: true,
        date: true,
        startTime: true,
        endTime: true,
        topic: true,
        group: { select: { id: true, name: true } },
      },
    });

    // Xonalar bo'yicha guruhlash
    const byRoom = new Map<string, typeof lessons>();
    for (const l of lessons) {
      const room = l.room!;
      if (!byRoom.has(room)) byRoom.set(room, []);
      byRoom.get(room)!.push(l);
    }

    return Array.from(byRoom.entries()).map(([room, items]) => ({
      room,
      slotsCount: items.length,
      slots: items,
    }));
  }

  // ============================================================
  // CREATE LESSON
  // ============================================================
  async createLesson(dto: CreateLessonDto) {
    const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException("Guruh topilmadi");

    this.assertTimeOrder(dto.startTime, dto.endTime);
    await this.assertNoRoomConflict(new Date(dto.date), dto.startTime, dto.endTime, dto.room);

    return this.prisma.lesson.create({
      data: {
        groupId: dto.groupId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        room: dto.room ?? group.room,
        topic: dto.topic,
        status: dto.status ?? LessonStatus.scheduled,
        notes: dto.notes,
      },
      include: this.lessonInclude(),
    });
  }

  // ============================================================
  // FIND ONE
  // ============================================================
  async findOne(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: this.lessonInclude(),
    });
    if (!lesson) throw new NotFoundException("Dars topilmadi");
    return lesson;
  }

  // ============================================================
  // UPDATE LESSON
  // ============================================================
  async updateLesson(id: string, dto: UpdateLessonDto) {
    const existing = await this.prisma.lesson.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Dars topilmadi");

    const newDate = dto.date ? new Date(dto.date) : existing.date;
    const newStart = dto.startTime ?? existing.startTime;
    const newEnd = dto.endTime ?? existing.endTime;
    const newRoom = dto.room ?? existing.room;

    if (dto.startTime || dto.endTime) this.assertTimeOrder(newStart, newEnd);

    if (dto.date || dto.startTime || dto.endTime || dto.room) {
      await this.assertNoRoomConflict(newDate, newStart, newEnd, newRoom, id);
    }

    const data: Prisma.LessonUpdateInput = {};
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.startTime !== undefined) data.startTime = dto.startTime;
    if (dto.endTime !== undefined) data.endTime = dto.endTime;
    if (dto.room !== undefined) data.room = dto.room;
    if (dto.topic !== undefined) data.topic = dto.topic;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.lesson.update({
      where: { id },
      data,
      include: this.lessonInclude(),
    });
  }

  // ============================================================
  // REMOVE
  // ============================================================
  async removeLesson(id: string) {
    const existing = await this.prisma.lesson.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Dars topilmadi");
    await this.prisma.lesson.delete({ where: { id } });
    return { message: "Dars o'chirildi" };
  }

  // ============================================================
  // INTERNAL
  // ============================================================
  private lessonInclude() {
    return {
      group: {
        select: {
          id: true,
          name: true,
          format: true,
          course: { select: { id: true, name: true } },
          teacher: {
            select: {
              id: true,
              teacherId: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    } satisfies Prisma.LessonInclude;
  }

  private assertTimeOrder(start: string, end: string) {
    if (start >= end) {
      throw new BadRequestException("startTime endTime'dan kichik bo'lishi kerak");
    }
  }

  /** Xona bir vaqtning o'zida ikki guruh tomonidan band qilinmasligi tekshiruvi */
  private async assertNoRoomConflict(
    date: Date,
    start: string,
    end: string,
    room: string | null | undefined,
    excludeLessonId?: string,
  ) {
    if (!room) return;

    const conflict = await this.prisma.lesson.findFirst({
      where: {
        room,
        date,
        status: { not: LessonStatus.cancelled },
        id: excludeLessonId ? { not: excludeLessonId } : undefined,
        // Overlap: existing.start < new.end AND existing.end > new.start
        AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
      },
      select: { id: true, startTime: true, endTime: true, group: { select: { name: true } } },
    });

    if (conflict) {
      throw new BadRequestException(
        `Xona ${room} ushbu vaqt oralig'ida band: ${conflict.startTime}-${conflict.endTime} (${conflict.group.name})`,
      );
    }
  }
}
