import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ReceiptGenerator } from './receipt.generator';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, ReceiptGenerator],
  exports: [PaymentsService],
})
export class PaymentsModule {}
