import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { BatchJob } from './batch-job.entity';
import { BatchService } from './batch.service';
import { BatchProcessor } from './batch.processor';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { MailModule } from '../mail/mail.module';

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
  providers: [BatchService, BatchProcessor],
  controllers: [BatchController],
})
export class BatchModule {}
