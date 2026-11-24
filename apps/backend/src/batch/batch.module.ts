import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CertificatesModule } from '../certificates/certificates.module';
import { JobRunnerService } from '../common/job-runner/job-runner.service';
import { CoursesModule } from '../courses/courses.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

import { BatchJob } from './batch-job.entity';
import { BatchJobRunnerAdapter } from './batch.job-runner.adapter';
import { BatchProcessor } from './batch.processor';
import { BatchService } from './batch.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BatchJob]),
    BullModule.registerQueue({
      name: 'batch',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
    UsersModule,
    CoursesModule,
    CertificatesModule,
    MailModule,
  ],
  providers: [
    BatchService,
    BatchProcessor,
    JobRunnerService,
    BatchJobRunnerAdapter,
  ],
  exports: [JobRunnerService],
  controllers: [BatchController],
})
export class BatchModule {}
