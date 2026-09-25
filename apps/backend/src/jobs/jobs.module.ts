import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Job, JobApplication } from './job.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobRunnerService } from '../common/job-runner/job-runner.service';
import { JobsJobRunnerAdapter } from './jobs.job-runner.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([Job, JobApplication]), ScheduleModule.forRoot()],
  providers: [JobsService, JobRunnerService, JobsJobRunnerAdapter],
  controllers: [JobsController],
  exports: [JobsService, JobRunnerService],
})
export class JobsModule {}
