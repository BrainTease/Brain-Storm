import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from '../courses/course.entity';

import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { Payout } from './payout.entity';
import { RoyaltyCalculationService } from './royalty-calculation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payout, Enrollment, Course])],
  providers: [RoyaltyCalculationService, PayoutsService],
  controllers: [PayoutsController],
  exports: [PayoutsService, RoyaltyCalculationService],
})
export class PayoutsModule {}
