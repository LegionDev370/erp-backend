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
  // LIST + filter (month/year, student, group, status, method)
  // ============================================================
  async list(q: QueryPaymentsDto) {
    const where: Prisma.PaymentWhereInput = {};
    if (q.studentId) where.studentId = q.studentId;
    if (q.groupId) where.groupId = q.groupId;
    if (q.status) where.status = q.status;
    if (q.method) where.method = q.method;

    if (q.year && q.month) {
      const start = new Date(Date.UTC(q.year, q.month - 1, 1));
      const end = new Date(Date.UTC(q.year, q.month, 1));
      where.dueDate = { gte: start, lt: end };
    } else if (q.year) {
      where.dueDate = {
        gte: new Date(Date.UTC(q.year, 0, 1)),
        lt: new Date(Date.UTC(q.year + 1, 0, 1)),
      };
    }

    if (q.search) {
      where.OR = [
        { transactionId: { contains: q.search, mode: 'insensitive' } },
        { notes: { contains: q.search, mode: 'insensitive' } },
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
  // CREATE
  // ============================================================
  async create(dto: CreatePaymentDto) {
    const [student, group] = await this.prisma.$transaction([
      this.prisma.student.findUnique({
        where: { id: dto.studentId },
        include: { user: { select: { deletedAt: true } } },
      }),
      this.prisma.group.findUnique({ where: { id: dto.groupId } }),
    ]);
    if (!student || student.user.deletedAt) throw new NotFoundException("Talaba topilmadi");
    if (!group) throw new NotFoundException("Guruh topilmadi");

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
        groupId: dto.groupId,
        amount: dto.amount,
        method: dto.method,
        status,
        paidAt,
        dueDate: new Date(dto.dueDate),
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
  // REFUND
  // ============================================================
  async refund(id: string, dto: RefundPaymentDto) {
    const existing = await this.prisma.payment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("To'lov topilmadi");

    if (existing.status === PaymentStatus.refunded) {
      throw new BadRequestException("Bu to'lov allaqachon qaytarilgan");
    }
    if (existing.status !== PaymentStatus.paid && existing.status !== PaymentStatus.partial) {
      throw new BadRequestException("Faqat to'langan/qisman to'lovni qaytarish mumkin");
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.refunded,
        notes: dto.reason
          ? `${existing.notes ?? ''}\n[REFUND] ${dto.reason}`.trim()
          : existing.notes,
      },
      include: this.fullInclude(),
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
        group: { include: { course: { select: { name: true } } } },
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
        group: {
          name: payment.group.name,
          courseName: payment.group.course.name,
        },
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
      orderBy: { dueDate: 'desc' },
      include: { group: { select: { id: true, name: true } } },
    });

    const totalPaid = payments
      .filter((p) => p.status === PaymentStatus.paid)
      .reduce((s, p) => s + Number(p.amount), 0);
    const totalPending = payments
      .filter((p) => p.status === PaymentStatus.pending)
      .reduce((s, p) => s + Number(p.amount), 0);

    return {
      stats: {
        totalPaid,
        totalPending,
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
      group: { select: { id: true, name: true } },
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
      group: {
        select: {
          id: true,
          name: true,
          monthlyPrice: true,
          course: { select: { name: true } },
        },
      },
    } satisfies Prisma.PaymentInclude;
  }
}
