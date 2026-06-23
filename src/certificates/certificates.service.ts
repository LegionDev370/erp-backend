import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // STUDENT — sertifikatlarim
  // ============================================================
  async myCertificates(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new BadRequestException("Faqat talaba hisobi uchun");

    return this.prisma.certificate.findMany({
      where: { studentId: student.id, status: 'issued' },
      orderBy: { issuedAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            instructor: { select: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });
  }

  // ============================================================
  // STUDENT — kurs tugatilganda sertifikat olish
  // ============================================================
  async claim(userId: string, courseId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new BadRequestException("Faqat talaba hisobi uchun");

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId } },
    });
    if (!enrollment) throw new NotFoundException("Siz bu kursga yozilmagansiz");
    if (enrollment.status !== 'completed' || enrollment.progress < 100) {
      throw new BadRequestException("Sertifikat uchun kursni 100% tugatish kerak");
    }

    const existing = await this.prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId } },
    });
    if (existing) {
      if (existing.status === 'issued') {
        throw new ConflictException("Sertifikat allaqachon berilgan");
      }
      return this.prisma.certificate.update({
        where: { id: existing.id },
        data: { status: 'issued', issuedAt: new Date() },
      });
    }

    const serialNo = await this.generateSerialNo();
    return this.prisma.certificate.create({
      data: { studentId: student.id, courseId, serialNo },
      include: { course: { select: { name: true } } },
    });
  }

  // ============================================================
  // ADMIN — barcha sertifikatlar
  // ============================================================
  async list(q: PaginationDto) {
    const where: Prisma.CertificateWhereInput = {};
    if (q.search) {
      where.OR = [
        { serialNo: { contains: q.search, mode: 'insensitive' } },
        { course: { name: { contains: q.search, mode: 'insensitive' } } },
        { student: { user: { firstName: { contains: q.search, mode: 'insensitive' } } } },
        { student: { user: { lastName: { contains: q.search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.certificate.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: { issuedAt: 'desc' },
        include: {
          course: { select: { id: true, name: true } },
          student: {
            select: { studentId: true, user: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      this.prisma.certificate.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  async revoke(id: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException("Sertifikat topilmadi");
    return this.prisma.certificate.update({
      where: { id },
      data: { status: 'revoked' },
    });
  }

  // ============================================================
  // INTERNAL — CERT-2026-0001 formatdagi seriya raqami
  // ============================================================
  private async generateSerialNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CERT-${year}-`;
    const last = await this.prisma.certificate.findFirst({
      where: { serialNo: { startsWith: prefix } },
      orderBy: { serialNo: 'desc' },
      select: { serialNo: true },
    });
    let next = 1;
    if (last) {
      const parsed = parseInt(last.serialNo.slice(prefix.length), 10);
      if (!Number.isNaN(parsed)) next = parsed + 1;
    }
    return `${prefix}${String(next).padStart(4, '0')}`;
  }
}
