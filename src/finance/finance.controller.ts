import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { FinanceService } from './finance.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { CreateExpenseCategoryDto } from './dto/create-category.dto';
import { KpiQueryDto } from './dto/kpi-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin · Finance')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ===== KPIs & charts =====
  @Get('kpis')
  @ApiOperation({ summary: '4 KPI: daromad, xarajat, foyda, foyda%' })
  kpis(@Query() q: KpiQueryDto) {
    return this.financeService.kpis(q);
  }

  @Get('revenue-vs-expense')
  @ApiOperation({ summary: 'Line chart: 12 oy daromad vs xarajat' })
  revenueVsExpense(@Query() q: KpiQueryDto) {
    return this.financeService.revenueVsExpense(q);
  }

  @Get('expense-categories')
  @ApiOperation({ summary: "Pie chart: xarajat kategoriyalari bo'yicha" })
  expenseCategories(@Query() q: KpiQueryDto) {
    return this.financeService.expenseCategories(q);
  }

  // ===== Categories =====
  @Get('categories')
  @ApiOperation({ summary: "Xarajat kategoriyalari ro'yxati" })
  listCategories() {
    return this.financeService.listCategories();
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi kategoriya' })
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.financeService.createCategory(dto);
  }

  // ===== Expenses CRUD =====
  @Get('expenses')
  @ApiOperation({ summary: "Xarajatlar ro'yxati (filter: categoryId, year/month, from/to)" })
  listExpenses(@Query() q: QueryExpensesDto) {
    return this.financeService.listExpenses(q);
  }

  @Post('expenses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Yangi xarajat qo'shish" })
  createExpense(@Body() dto: CreateExpenseDto, @CurrentUser('sub') userId: string) {
    return this.financeService.createExpense(dto, userId);
  }

  @Patch('expenses/:id')
  @ApiOperation({ summary: 'Xarajatni yangilash' })
  updateExpense(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.financeService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xarajatni o'chirish" })
  removeExpense(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.financeService.removeExpense(id);
  }
}
