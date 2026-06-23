import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // PUBLIC — aloqa formasi yuborish
  // ============================================================
  async create(dto: CreateContactDto) {
    await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
      },
    });
    return { message: "Murojaatingiz qabul qilindi. Tez orada bog'lanamiz." };
  }

  // ============================================================
  // ADMIN
  // ============================================================
  async list(q: PaginationDto, status?: ContactStatus) {
    const where: Prisma.ContactMessageWhereInput = {};
    if (status) where.status = status;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
        { subject: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  async updateStatus(id: string, dto: UpdateContactStatusDto) {
    const existing = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Murojaat topilmadi");
    return this.prisma.contactMessage.update({ where: { id }, data: { status: dto.status } });
  }
}
