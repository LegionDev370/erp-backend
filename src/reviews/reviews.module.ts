import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AdminReviewsController, ReviewsController } from './reviews.controller';

@Module({
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
