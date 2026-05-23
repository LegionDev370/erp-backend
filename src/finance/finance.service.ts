import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { CreateExpenseCategoryDto } from './dto/create-category.dto';
import { KpiQueryDto } from './dto/kpi-query.dto';
import { paginate } from '../common/dto/pagination.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // KPIs — daromad / xarajat / foyda / foiz
  // ============================================================
  async kpis(q: KpiQueryDto) {
    const year = q.year ?? new Date().getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const [paidAgg, expenseAgg] = await this.prisma.$transaction([
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.paid, paidAt: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
    ]);

    const revenue = Number(paidAgg._sum.amount ?? 0);
    const expense = Number(expenseAgg._sum.amount ?? 0);
    const profit = revenue - expense;
    const profitPercent = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    return { year, revenue, expense, profit, profitPercent };
  }

  // ============================================================
  // REVENUE VS EXPENSE CHART — 12 oy
  // ============================================================
  async revenueVsExpense(q: KpiQueryDto) {
    const year = q.year ?? new Date().getUTCFullYear();

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: this.monthName(i + 1),
      revenue: 0,
      expense: 0,
    }));

    // Revenue (paid payments grouped by month)
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.paid,
        paidAt: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: { amount: true, paidAt: true },
    });

    for (const p of payments) {
      if (!p.paidAt) continue;
      const m = p.paidAt.getUTCMonth();
      months[m].revenue += Number(p.amount);
    }

    // Expenses grouped by month
    const expenses = await this.prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: { amount: true, date: true },
    });

    for (const e of expenses) {
      const m = e.date.getUTCMonth();
      months[m].expense += Number(e.amount);
    }

    return { year, months };
  }

  // ============================================================
  // EXPENSE CATEGORIES CHART (pie) — yiliga kategoriya bo'yicha
  // ============================================================
  async expenseCategories(q: KpiQueryDto) {
    const year = q.year ?? new Date().getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const grouped = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    if (!grouped.length) return { year, total: 0, items: [] };

    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: grouped.map((g) => g.categoryId) } },
      select: { id: true, name: true, color: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const total = grouped.reduce((s, g) => s + Number(g._sum.amount ?? 0), 0);

    const items = grouped
      .map((g) => {
        const c = catMap.get(g.categoryId);
        const amount = Number(g._sum.amount ?? 0);
        return {
          categoryId: g.categoryId,
          name: c?.name ?? '—',
          color: c?.color ?? '#9CA3AF',
          amount,
          percent: total > 0 ? Math.round((amount / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { year, total, items };
  }

  // ============================================================
  // CATEGORIES CRUD
  // ============================================================
  async listCategories() {
    return this.prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(dto: CreateExpenseCategoryDto) {
    const dup = await this.prisma.expenseCategory.findUnique({ where: { name: dto.name } });
    if (dup) throw new ConflictException("Bunday nomli kategoriya allaqachon mavjud");
    return this.prisma.expenseCategory.create({
      data: { name: dto.name, color: dto.color ?? '#2563EB' },
    });
  }

  // ============================================================
  // EXPENSES CRUD
  // ============================================================
  async listExpenses(q: QueryExpensesDto) {
    const where: Prisma.ExpenseWhereInput = {};
    if (q.categoryId) where.categoryId = q.categoryId;

    if (q.year && q.month) {
      where.date = {
        gte: new Date(Date.UTC(q.year, q.month - 1, 1)),
        lt: new Date(Date.UTC(q.year, q.month, 1)),
      };
    } else if (q.year) {
      where.date = {
        gte: new Date(Date.UTC(q.year, 0, 1)),
        lt: new Date(Date.UTC(q.year + 1, 0, 1)),
      };
    } else if (q.from || q.to) {
      where.date = {};
      if (q.from) where.date.gte = new Date(q.from);
      if (q.to) where.date.lte = new Date(q.to);
    }

    if (q.search) {
      where.description = { contains: q.search, mode: 'insensitive' };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: q.sortBy === 'amount' ? { amount: q.order ?? 'desc' } : { date: q.order ?? 'desc' },
        include: {
          category: { select: { id: true, name: true, color: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  async createExpense(dto: CreateExpenseDto, createdBy: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException("Kategoriya topilmadi");

    return this.prisma.expense.create({
      data: {
        categoryId: dto.categoryId,
        description: dto.description,
        amount: dto.amount,
        date: new Date(dto.date),
        attachmentUrl: dto.attachmentUrl,
        createdBy,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async updateExpense(id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Xarajat topilmadi");

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const cat = await this.prisma.expenseCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!cat) throw new NotFoundException("Yangi kategoriya topilmadi");
    }

    const data: Prisma.ExpenseUpdateInput = {};
    if (dto.categoryId !== undefined) data.category = { connect: { id: dto.categoryId } };
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.attachmentUrl !== undefined) data.attachmentUrl = dto.attachmentUrl;

    return this.prisma.expense.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async removeExpense(id: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Xarajat topilmadi");
    await this.prisma.expense.delete({ where: { id } });
    return { message: "Xarajat o'chirildi" };
  }

  // ----------------- helpers -----------------
  private monthName(m: number): string {
    return [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
    ][m - 1];
  }
}
