import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';

import { CohortMember } from './cohort-member.entity';
import { Cohort } from './cohort.entity';
import { CohortsController } from './cohorts.controller';
import { CohortsService } from './cohorts.service';
import { SessionAttendance } from './session-attendance.entity';
import { CohortSession } from './session.entity';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cohort, CohortMember, CohortSession, SessionAttendance]),
    ScheduleModule.forRoot(),
    forwardRef(() => NotificationsModule),
  ],
  providers: [CohortsService, SessionsService],
  controllers: [CohortsController, SessionsController],
  exports: [CohortsService, SessionsService],
})
export class CohortsModule {}
