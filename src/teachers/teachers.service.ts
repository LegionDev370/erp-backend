import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Prisma, TeacherStatus, UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { QueryTeachersDto } from './dto/query-teachers.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async list(q: QueryTeachersDto) {
    const where: Prisma.TeacherWhereInput = {
      user: { deletedAt: null },
    };
    if (q.status) where.status = q.status;
    if (q.specialty) where.specialty = { contains: q.specialty, mode: 'insensitive' };
    if (q.search) {
      where.OR = [
        { teacherId: { contains: q.search, mode: 'insensitive' } },
        { specialty: { contains: q.search, mode: 'insensitive' } },
        { user: { firstName: { contains: q.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: q.search, mode: 'insensitive' } } },
        { user: { email: { contains: q.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.TeacherOrderByWithRelationInput =
      q.sortBy === 'hireDate'
        ? { hireDate: q.order ?? 'desc' }
        : q.sortBy === 'rating'
          ? { rating: q.order ?? 'desc' }
          : { user: { createdAt: q.order ?? 'desc' } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.teacher.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy,
        include: { user: this.userSelect() },
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return paginate(items.map((t) => this.serialize(t)), total, q.page ?? 1, q.limit ?? 20);
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: { user: this.userSelect() },
    });
    if (!teacher || teacher.user.deletedAt) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }
    return this.serialize(teacher);
  }

  async create(dto: CreateTeacherDto) {
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
    const teacherId = await this.generateTeacherId();

    const teacher = await this.prisma.$transaction(async (tx) => {
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
          role: UserRole.teacher,
        },
      });
      return tx.teacher.create({
        data: {
          userId: user.id,
          teacherId,
          specialty: dto.specialty,
          experience: dto.experience ?? 0,
          bio: dto.bio,
          hireDate: new Date(dto.hireDate),
          salary: dto.salary ?? 0,
          socialLinks: dto.socialLinks
            ? (dto.socialLinks as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          status: dto.status ?? TeacherStatus.active,
        },
        include: { user: this.userSelect() },
      });
    });

    return this.serialize(teacher);
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const existing = await this.prisma.teacher.findUnique({
      where: { id },
      include: { user: { select: { id: true, deletedAt: true } } },
    });
    if (!existing || existing.user.deletedAt) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

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

    const teacherData: Prisma.TeacherUpdateInput = {};
    if (dto.specialty !== undefined) teacherData.specialty = dto.specialty;
    if (dto.experience !== undefined) teacherData.experience = dto.experience;
    if (dto.bio !== undefined) teacherData.bio = dto.bio;
    if (dto.hireDate !== undefined) teacherData.hireDate = new Date(dto.hireDate);
    if (dto.salary !== undefined) teacherData.salary = dto.salary;
    if (dto.socialLinks !== undefined)
      teacherData.socialLinks = dto.socialLinks as unknown as Prisma.InputJsonValue;
    if (dto.status !== undefined) teacherData.status = dto.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length) {
        await tx.user.update({ where: { id: existing.user.id }, data: userData });
      }
      return tx.teacher.update({
        where: { id },
        data: teacherData,
        include: { user: this.userSelect() },
      });
    });

    return this.serialize(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.teacher.findUnique({
      where: { id },
      include: { user: { select: { id: true, deletedAt: true } } },
    });
    if (!existing || existing.user.deletedAt) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: existing.user.id },
        data: { deletedAt: new Date(), status: UserStatus.inactive },
      }),
      this.prisma.teacher.update({
        where: { id },
        data: { status: TeacherStatus.inactive },
      }),
      this.prisma.session.deleteMany({ where: { userId: existing.user.id } }),
    ]);

    return { message: "O'qituvchi o'chirildi" };
  }

  async setAvatar(id: string, avatarUrl: string) {
    const existing = await this.prisma.teacher.findUnique({
      where: { id },
      select: { user: { select: { id: true, deletedAt: true } } },
    });
    if (!existing || existing.user.deletedAt) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }
    await this.prisma.user.update({
      where: { id: existing.user.id },
      data: { avatarUrl },
    });
    return { avatarUrl };
  }

  // INTERNAL
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

  private serialize(teacher: { user: Record<string, unknown> } & Record<string, unknown>) {
    const { user, ...teacherRest } = teacher;
    const { id: userId, createdAt: userCreatedAt, updatedAt: userUpdatedAt, ...userRest } = user;
    return {
      ...teacherRest, // id = teacher.id
      ...userRest,
      userId,
      userCreatedAt,
      userUpdatedAt,
    };
  }

  private async generateTeacherId(): Promise<string> {
    const last = await this.prisma.teacher.findFirst({
      orderBy: { teacherId: 'desc' },
      select: { teacherId: true },
    });
    let next = 1;
    if (last?.teacherId.startsWith('TC-')) {
      const parsed = parseInt(last.teacherId.slice(3), 10);
      if (!Number.isNaN(parsed)) next = parsed + 1;
    }
    return `TC-${String(next).padStart(3, '0')}`;
  }
}
