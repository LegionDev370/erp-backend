import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { paginate } from '../common/dto/pagination.dto';
import { ReceiptGenerator } from './receipt.generator';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptGenerator: ReceiptGenerator,
  ) {}

  // ============================================================
  // LIST + filter (month/year, student, course, status, method)
  // ============================================================
  async list(q: QueryPaymentsDto) {
    const where: Prisma.PaymentWhereInput = {};
    if (q.studentId) where.studentId = q.studentId;
    if (q.courseId) where.courseId = q.courseId;
    if (q.status) where.status = q.status;
    if (q.method) where.method = q.method;

    if (q.year && q.month) {
      const start = new Date(Date.UTC(q.year, q.month - 1, 1));
      const end = new Date(Date.UTC(q.year, q.month, 1));
      where.createdAt = { gte: start, lt: end };
    } else if (q.year) {
      where.createdAt = {
        gte: new Date(Date.UTC(q.year, 0, 1)),
        lt: new Date(Date.UTC(q.year + 1, 0, 1)),
      };
    }

    if (q.search) {
      where.OR = [
        { transactionId: { contains: q.search, mode: 'insensitive' } },
        { course: { name: { contains: q.search, mode: 'insensitive' } } },
        { student: { studentId: { contains: q.search, mode: 'insensitive' } } },
        { student: { user: { firstName: { contains: q.search, mode: 'insensitive' } } } },
        { student: { user: { lastName: { contains: q.search, mode: 'insensitive' } } } },
      ];
    }

    const orderBy: Prisma.PaymentOrderByWithRelationInput =
      q.sortBy === 'amount'
        ? { amount: q.order ?? 'desc' }
        : q.sortBy === 'paidAt'
          ? { paidAt: q.order ?? 'desc' }
          : { createdAt: q.order ?? 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy,
        include: this.briefInclude(),
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  // ============================================================
  // FIND ONE
  // ============================================================
  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: this.fullInclude(),
    });
    if (!payment) throw new NotFoundException("To'lov topilmadi");
    return payment;
  }

  // ============================================================
  // CREATE (admin tomonidan qo'lda to'lov qo'shish)
  // ============================================================
  async create(dto: CreatePaymentDto) {
    const [student, course] = await this.prisma.$transaction([
      this.prisma.student.findUnique({
        where: { id: dto.studentId },
        include: { user: { select: { deletedAt: true } } },
      }),
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
    ]);
    if (!student || student.user.deletedAt) throw new NotFoundException("Talaba topilmadi");
    if (!course) throw new NotFoundException("Kurs topilmadi");

    const status = dto.status ?? PaymentStatus.pending;
    const paidAt =
      dto.paidAt !== undefined
        ? new Date(dto.paidAt)
        : status === PaymentStatus.paid
          ? new Date()
          : null;

    return this.prisma.payment.create({
      data: {
        studentId: dto.studentId,
        courseId: dto.courseId,
        amount: dto.amount,
        method: dto.method,
        status,
        paidAt,
        transactionId: dto.transactionId,
        notes: dto.notes,
      },
      include: this.fullInclude(),
    });
  }

  // ============================================================
  // UPDATE STATUS
  // ============================================================
  async updateStatus(id: string, dto: UpdatePaymentStatusDto) {
    const existing = await this.prisma.payment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("To'lov topilmadi");

    if (existing.status === PaymentStatus.refunded) {
      throw new BadRequestException("Qaytarilgan to'lovni o'zgartirib bo'lmaydi");
    }

    const data: Prisma.PaymentUpdateInput = { status: dto.status };
    if (dto.transactionId !== undefined) data.transactionId = dto.transactionId;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status === PaymentStatus.paid && !existing.paidAt) data.paidAt = new Date();
    if (dto.status === PaymentStatus.refunded) data.paidAt = null;

    return this.prisma.payment.update({
      where: { id },
      data,
      include: this.fullInclude(),
    });
  }

  // ============================================================
  // REFUND — to'langan to'lovni qaytarish + enrollmentni bekor qilish
  // ============================================================
  async refund(id: string, dto: RefundPaymentDto) {
    const existing = await this.prisma.payment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("To'lov topilmadi");

    if (existing.status === PaymentStatus.refunded) {
      throw new BadRequestException("Bu to'lov allaqachon qaytarilgan");
    }
    if (existing.status !== PaymentStatus.paid) {
      throw new BadRequestException("Faqat to'langan to'lovni qaytarish mumkin");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.refunded,
          paidAt: null,
          notes: dto.reason
            ? `${existing.notes ?? ''}\n[REFUND] ${dto.reason}`.trim()
            : existing.notes,
        },
        include: this.fullInclude(),
      });

      // Tegishli enrollmentni refunded holatga o'tkazamiz
      await tx.enrollment.updateMany({
        where: { studentId: existing.studentId, courseId: existing.courseId },
        data: { status: 'refunded' },
      });

      return updated;
    });
  }

  // ============================================================
  // RECEIPT (PDF stream)
  // ============================================================
  async receipt(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true, phone: true } } },
        },
        course: { select: { name: true } },
      },
    });
    if (!payment) throw new NotFoundException("To'lov topilmadi");

    return {
      filename: `receipt-${payment.id.slice(0, 8)}.pdf`,
      stream: this.receiptGenerator.generate({
        receiptNumber: payment.id.slice(0, 8).toUpperCase(),
        paidAt: payment.paidAt,
        amount: payment.amount.toString(),
        method: payment.method,
        status: payment.status,
        student: {
          fullName: `${payment.student.user.firstName} ${payment.student.user.lastName}`,
          studentId: payment.student.studentId,
          phone: payment.student.user.phone,
        },
        courseName: payment.course.name,
        transactionId: payment.transactionId,
        notes: payment.notes,
      }),
    };
  }

  // ============================================================
  // STUDENT PAYMENTS HISTORY
  // ============================================================
  async studentHistory(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException("Talaba topilmadi");

    const payments = await this.prisma.payment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { id: true, name: true, slug: true } } },
    });

    const totalPaid = payments
      .filter((p) => p.status === PaymentStatus.paid)
      .reduce((s, p) => s + Number(p.amount), 0);

    return {
      stats: {
        totalPaid,
        count: payments.length,
      },
      items: payments,
    };
  }

  // ============================================================
  // INTERNAL
  // ============================================================
  private briefInclude() {
    return {
      student: {
        select: {
          id: true,
          studentId: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      course: { select: { id: true, name: true } },
    } satisfies Prisma.PaymentInclude;
  }

  private fullInclude() {
    return {
      student: {
        select: {
          id: true,
          studentId: true,
          user: { select: { firstName: true, lastName: true, phone: true, email: true } },
        },
      },
      course: { select: { id: true, name: true, slug: true, price: true } },
    } satisfies Prisma.PaymentInclude;
  }
}
