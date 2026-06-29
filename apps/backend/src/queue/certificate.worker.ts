import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_CERTIFICATE,
  JOB_ISSUE_CERTIFICATE,
  JOB_MINT_CREDENTIAL,
} from './queue.constants';

export interface IssueCertificateJobData {
  userId: string;
  courseId: string;
  userEmail: string;
  userName: string;
  courseTitle: string;
  recipientPublicKey?: string;
}

export interface MintCredentialJobData {
  recipientPublicKey: string;
  courseId: string;
  courseTitle: string;
  certificateHash: string;
}

@Processor(QUEUE_CERTIFICATE)
export class CertificateWorker extends WorkerHost {
  private readonly logger = new Logger(CertificateWorker.name);

  async process(job: Job<IssueCertificateJobData | MintCredentialJobData>): Promise<void> {
    switch (job.name) {
      case JOB_ISSUE_CERTIFICATE: {
        const data = job.data as IssueCertificateJobData;
        this.logger.log(
          `Issuing certificate for user ${data.userId} on course ${data.courseId} [jobId=${job.id}]`,
        );
        // The CertificatesModule handles issuance; this job acts as the async
        // trigger so heavy on-chain work leaves the HTTP request path.
        // In production, inject CertificatesService here and call it.
        break;
      }

      case JOB_MINT_CREDENTIAL: {
        const data = job.data as MintCredentialJobData;
        this.logger.log(
          `Minting on-chain credential for ${data.recipientPublicKey} [jobId=${job.id}]`,
        );
        // In production, inject StellarService here and call mintCertificateNFT.
        break;
      }

      default:
        this.logger.warn(`Unknown certificate job: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Certificate job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${err.message}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Certificate job ${job.id} (${job.name}) completed successfully`);
  }
}
