import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Course } from '../courses/course.entity';
import { Enrollment } from '../enrollments/enrollment.entity';

import { Payout } from './payout.entity';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { RoyaltyCalculationService } from './royalty-calculation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payout, Enrollment, Course])],
  providers: [RoyaltyCalculationService, PayoutsService],
  controllers: [PayoutsController],
  exports: [PayoutsService, RoyaltyCalculationService],
})
export class PayoutsModule {}
