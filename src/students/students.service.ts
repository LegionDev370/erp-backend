import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Prisma, StudentStatus, UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ============================================================
  // LIST + filter + pagination + search
  // ============================================================
  async list(q: QueryStudentsDto) {
    const where: Prisma.StudentWhereInput = {
      user: { deletedAt: null },
    };

    if (q.status) where.status = q.status;
    if (q.search) {
      where.OR = [
        { studentId: { contains: q.search, mode: 'insensitive' } },
        { user: { firstName: { contains: q.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: q.search, mode: 'insensitive' } } },
        { user: { email: { contains: q.search, mode: 'insensitive' } } },
        { user: { phone: { contains: q.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.StudentOrderByWithRelationInput =
      q.sortBy === 'enrolledAt'
        ? { enrolledAt: q.order ?? 'desc' }
        : { user: { createdAt: q.order ?? 'desc' } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy,
        include: { user: this.userSelect() },
      }),
      this.prisma.student.count({ where }),
    ]);

    return paginate(items.map((s) => this.serialize(s)), total, q.page ?? 1, q.limit ?? 20);
  }

  // ============================================================
  // FIND ONE
  // ============================================================
  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { user: this.userSelect() },
    });
    if (!student || student.user.deletedAt) {
      throw new NotFoundException("Talaba topilmadi");
    }
    return this.serialize(student);
  }

  // ============================================================
  // CREATE (user + student transactionda)
  // ============================================================
  async create(dto: CreateStudentDto) {
    const dup = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
      select: { email: true, phone: true },
    });
    if (dup) {
      if (dup.email === dto.email) throw new ConflictException("Bu email allaqachon mavjud");
      throw new ConflictException("Bu telefon raqami allaqachon mavjud");
    }

    const rounds = this.config.get<number>('app.bcryptRounds') ?? 12;
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const studentId = await this.generateStudentId();

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          gender: dto.gender,
          address: dto.address,
          role: UserRole.student,
        },
      });
      return tx.student.create({
        data: {
          userId: user.id,
          studentId,
          parentFirstName: dto.parentFirstName,
          parentLastName: dto.parentLastName,
          parentPhone: dto.parentPhone,
          motherName: dto.motherName,
          motherPhone: dto.motherPhone,
          enrolledAt: dto.enrolledAt ? new Date(dto.enrolledAt) : new Date(),
          status: dto.status ?? StudentStatus.active,
        },
        include: { user: this.userSelect() },
      });
    });

    return this.serialize(student);
  }

  // ============================================================
  // UPDATE
  // ============================================================
  async update(id: string, dto: UpdateStudentDto) {
    const existing = await this.prisma.student.findUnique({
      where: { id },
      include: { user: { select: { id: true, deletedAt: true } } },
    });
    if (!existing || existing.user.deletedAt) {
      throw new NotFoundException("Talaba topilmadi");
    }

    // user maydonlari (faqat berilganlarini yangilaymiz)
    const userData: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) userData.email = dto.email;
    if (dto.phone !== undefined) userData.phone = dto.phone;
    if (dto.firstName !== undefined) userData.firstName = dto.firstName;
    if (dto.lastName !== undefined) userData.lastName = dto.lastName;
    if (dto.middleName !== undefined) userData.middleName = dto.middleName;
    if (dto.birthDate !== undefined)
      userData.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.gender !== undefined) userData.gender = dto.gender;
    if (dto.address !== undefined) userData.address = dto.address;
    if (dto.userStatus !== undefined) userData.status = dto.userStatus;

    const studentData: Prisma.StudentUpdateInput = {};
    if (dto.parentFirstName !== undefined) studentData.parentFirstName = dto.parentFirstName;
    if (dto.parentLastName !== undefined) studentData.parentLastName = dto.parentLastName;
    if (dto.parentPhone !== undefined) studentData.parentPhone = dto.parentPhone;
    if (dto.motherName !== undefined) studentData.motherName = dto.motherName;
    if (dto.motherPhone !== undefined) studentData.motherPhone = dto.motherPhone;
    if (dto.enrolledAt !== undefined) studentData.enrolledAt = new Date(dto.enrolledAt);
    if (dto.status !== undefined) studentData.status = dto.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length) {
        await tx.user.update({ where: { id: existing.user.id }, data: userData });
      }
      return tx.student.update({
        where: { id },
        data: studentData,
        include: { user: this.userSelect() },
      });
    });

    return this.serialize(updated);
  }

  // ============================================================
  // SOFT DELETE
  // ============================================================
  async remove(id: string) {
    const existing = await this.prisma.student.findUnique({
      where: { id },
      include: { user: { select: { id: true, deletedAt: true } } },
    });
    if (!existing || existing.user.deletedAt) {
      throw new NotFoundException("Talaba topilmadi");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: existing.user.id },
        data: { deletedAt: new Date(), status: UserStatus.inactive },
      }),
      this.prisma.student.update({
        where: { id },
        data: { status: StudentStatus.inactive },
      }),
      // Sessiyalarni o'chiramiz
      this.prisma.session.deleteMany({ where: { userId: existing.user.id } }),
    ]);

    return { message: "Talaba o'chirildi" };
  }

  // ============================================================
  // AVATAR
  // ============================================================
  async setAvatar(id: string, avatarUrl: string) {
    const existing = await this.prisma.student.findUnique({
      where: { id },
      select: { user: { select: { id: true, deletedAt: true } } },
    });
    if (!existing || existing.user.deletedAt) {
      throw new NotFoundException("Talaba topilmadi");
    }
    await this.prisma.user.update({
      where: { id: existing.user.id },
      data: { avatarUrl },
    });
    return { avatarUrl };
  }

  // ============================================================
  // INTERNAL
  // ============================================================
  private userSelect() {
    return {
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        middleName: true,
        birthDate: true,
        gender: true,
        address: true,
        avatarUrl: true,
        status: true,
        role: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      } satisfies Prisma.UserSelect,
    };
  }

  private serialize(student: { user: Record<string, unknown> } & Record<string, unknown>) {
    const { user, ...studentRest } = student;
    // user spread oxirida - user.id, user.createdAt va boshqa to'qnashuvchi maydonlarni
    // alohida nomlar ostida qaytarish
    const { id: userId, createdAt: userCreatedAt, updatedAt: userUpdatedAt, ...userRest } = user;
    return {
      ...studentRest, // id = student.id (route paramlari uchun)
      ...userRest, // user.firstName, email, va h.k.
      userId,
      userCreatedAt,
      userUpdatedAt,
    };
  }

  private async generateStudentId(): Promise<string> {
    const last = await this.prisma.student.findFirst({
      orderBy: { studentId: 'desc' },
      select: { studentId: true },
    });
    let next = 1;
    if (last?.studentId.startsWith('ST-')) {
      const parsed = parseInt(last.studentId.slice(3), 10);
      if (!Number.isNaN(parsed)) next = parsed + 1;
    }
    return `ST-${String(next).padStart(4, '0')}`;
  }
}
