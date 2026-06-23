import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InstructorStatus, Prisma, UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { QueryInstructorsDto } from './dto/query-instructors.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class InstructorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async list(q: QueryInstructorsDto) {
    const where: Prisma.InstructorWhereInput = {
      user: { deletedAt: null },
    };
    if (q.status) where.status = q.status;
    if (q.specialty) where.specialty = { contains: q.specialty, mode: 'insensitive' };
    if (q.search) {
      where.OR = [
        { instructorId: { contains: q.search, mode: 'insensitive' } },
        { specialty: { contains: q.search, mode: 'insensitive' } },
        { user: { firstName: { contains: q.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: q.search, mode: 'insensitive' } } },
        { user: { email: { contains: q.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.InstructorOrderByWithRelationInput =
      q.sortBy === 'rating'
        ? { rating: q.order ?? 'desc' }
        : { user: { createdAt: q.order ?? 'desc' } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.instructor.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy,
        include: { user: this.userSelect(), _count: { select: { courses: true } } },
      }),
      this.prisma.instructor.count({ where }),
    ]);

    return paginate(items.map((t) => this.serialize(t)), total, q.page ?? 1, q.limit ?? 20);
  }

  async findOne(id: string) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id },
      include: {
        user: this.userSelect(),
        _count: { select: { courses: true } },
        courses: {
          where: { status: 'active' },
          select: { id: true, name: true, slug: true, imageUrl: true, studentsCount: true, rating: true },
        },
      },
    });
    if (!instructor || instructor.user.deletedAt) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }
    return this.serialize(instructor);
  }

  async create(dto: CreateInstructorDto) {
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
    const instructorId = await this.generateInstructorId();

    const instructor = await this.prisma.$transaction(async (tx) => {
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
          role: UserRole.instructor,
        },
      });
      return tx.instructor.create({
        data: {
          userId: user.id,
          instructorId,
          specialty: dto.specialty,
          experience: dto.experience ?? 0,
          bio: dto.bio,
          socialLinks: dto.socialLinks
            ? (dto.socialLinks as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          status: dto.status ?? InstructorStatus.active,
        },
        include: { user: this.userSelect() },
      });
    });

    return this.serialize(instructor);
  }

  async update(id: string, dto: UpdateInstructorDto) {
    const existing = await this.prisma.instructor.findUnique({
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

    const instructorData: Prisma.InstructorUpdateInput = {};
    if (dto.specialty !== undefined) instructorData.specialty = dto.specialty;
    if (dto.experience !== undefined) instructorData.experience = dto.experience;
    if (dto.bio !== undefined) instructorData.bio = dto.bio;
    if (dto.socialLinks !== undefined)
      instructorData.socialLinks = dto.socialLinks as unknown as Prisma.InputJsonValue;
    if (dto.status !== undefined) instructorData.status = dto.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length) {
        await tx.user.update({ where: { id: existing.user.id }, data: userData });
      }
      return tx.instructor.update({
        where: { id },
        data: instructorData,
        include: { user: this.userSelect() },
      });
    });

    return this.serialize(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.instructor.findUnique({
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
      this.prisma.instructor.update({
        where: { id },
        data: { status: InstructorStatus.inactive },
      }),
      this.prisma.session.deleteMany({ where: { userId: existing.user.id } }),
    ]);

    return { message: "O'qituvchi o'chirildi" };
  }

  async setAvatar(id: string, avatarUrl: string) {
    const existing = await this.prisma.instructor.findUnique({
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

  private serialize(instructor: { user: Record<string, unknown> } & Record<string, unknown>) {
    const { user, ...instructorRest } = instructor;
    const { id: userId, createdAt: userCreatedAt, updatedAt: userUpdatedAt, ...userRest } = user;
    return {
      ...instructorRest, // id = instructor.id
      ...userRest,
      userId,
      userCreatedAt,
      userUpdatedAt,
    };
  }

  private async generateInstructorId(): Promise<string> {
    const last = await this.prisma.instructor.findFirst({
      orderBy: { instructorId: 'desc' },
      select: { instructorId: true },
    });
    let next = 1;
    if (last?.instructorId.startsWith('IN-')) {
      const parsed = parseInt(last.instructorId.slice(3), 10);
      if (!Number.isNaN(parsed)) next = parsed + 1;
    }
    return `IN-${String(next).padStart(3, '0')}`;
  }
}
