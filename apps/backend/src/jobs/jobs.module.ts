import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JobRunnerService } from '../common/job-runner/job-runner.service';

import { Job, JobApplication } from './job.entity';
import { JobsController } from './jobs.controller';
import { JobsJobRunnerAdapter } from './jobs.job-runner.adapter';
import { JobsService } from './jobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job, JobApplication]), ScheduleModule.forRoot()],
  providers: [JobsService, JobRunnerService, JobsJobRunnerAdapter],
  controllers: [JobsController],
  exports: [JobsService, JobRunnerService],
})
export class JobsModule {}
