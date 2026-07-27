import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Cohort } from './cohort.entity';
import { CohortMember } from './cohort-member.entity';
import { CohortSession } from './session.entity';
import { SessionAttendance } from './session-attendance.entity';
import { CohortsService } from './cohorts.service';
import { CohortsController } from './cohorts.controller';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { NotificationsModule } from '../notifications/notifications.module';

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
