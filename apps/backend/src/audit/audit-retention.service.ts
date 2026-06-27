import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditService } from './audit.service';

/**
 * Runs nightly to prune audit entries older than AUDIT_RETENTION_DAYS (default 365).
 * Also runs a weekly integrity check and logs any broken chain links.
 */
@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);
  private readonly retentionDays: number;

  constructor(private readonly auditService: AuditService) {
    this.retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS ?? '365', 10);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async pruneOldEntries(): Promise<void> {
    this.logger.log(`Running audit retention job (retention=${this.retentionDays}d)`);
    const deleted = await this.auditService.pruneOldEntries(this.retentionDays);
    this.logger.log(`Audit retention: removed ${deleted} entries`);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async verifyIntegrity(): Promise<void> {
    this.logger.log('Running weekly audit integrity verification');
    const report = await this.auditService.verifyIntegrity();
    if (!report.valid) {
      this.logger.error(`Audit integrity FAILED: ${report.broken} broken entries`, {
        brokenIds: report.brokenIds,
      });
    } else {
      this.logger.log(`Audit integrity OK: ${report.checked} entries verified`);
    }
  }
}
