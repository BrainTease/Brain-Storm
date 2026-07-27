import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { AuditLog, AuditAction } from './audit-log.entity';
import { CustomLoggerService } from '../common/logger/logger.service';
import { EncryptionService } from '../common/encryption.service';

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface IntegrityReport {
  checked: number;
  broken: number;
  brokenIds: string[];
  valid: boolean;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private logger: CustomLoggerService,
    private encryption: EncryptionService,
  ) {
    this.logger.setContext('AuditService');
  }

  async log(
    action: AuditAction | string,
    userId: string | null,
    success: boolean,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      // Get hash of most recent entry for chain
      const prevEntry = await this.auditRepo.findOne({
        where: {},
        order: { createdAt: 'DESC' },
        select: ['entryHash'],
      });
      const prevHash = prevEntry?.entryHash ?? null;

      // Encrypt PII
      const encryptedIp = ipAddress ? this.encryption.encrypt(ipAddress) : null;
      const encryptedUa = userAgent ? this.encryption.encrypt(userAgent) : null;

      // Redact PII from metadata
      const safeMetadata = metadata ? this.redactPii(metadata) : null;

      const entry = this.auditRepo.create({
        action,
        userId,
        success,
        metadata: safeMetadata,
        ipAddress: encryptedIp,
        userAgent: encryptedUa,
        prevHash,
      });

      // Compute entry hash BEFORE saving (createdAt not yet set, use Date.now())
      entry.entryHash = this.computeHash(entry, prevHash);

      await this.auditRepo.save(entry);
      this.logger.info(`Audit: ${action}`, { userId, success });
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }

  async getLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    const qb = this.auditRepo.createQueryBuilder('log');
    if (filters.userId) qb.andWhere('log.userId = :userId', { userId: filters.userId });
    if (filters.action) qb.andWhere('log.action = :action', { action: filters.action });
    if (filters.startDate) qb.andWhere('log.createdAt >= :start', { start: filters.startDate });
    if (filters.endDate) qb.andWhere('log.createdAt <= :end', { end: filters.endDate });
    qb.orderBy('log.createdAt', 'DESC')
      .limit(filters.limit ?? 100)
      .offset(filters.offset ?? 0);
    return qb.getMany();
  }

  /** Export logs as NDJSON (newline-delimited JSON). */
  async exportLogs(filters: AuditLogFilters): Promise<string> {
    const logs = await this.getLogs({ ...filters, limit: filters.limit ?? 10_000 });
    return logs.map((l) => JSON.stringify(l)).join('\n');
  }

  /**
   * Verifies the hash chain for all entries (or a filtered subset).
   * Returns a report of which entries are broken.
   */
  async verifyIntegrity(filters: AuditLogFilters = {}): Promise<IntegrityReport> {
    const logs = await this.getLogs({ ...filters, limit: filters.limit ?? 10_000 });
    const report: IntegrityReport = { checked: logs.length, broken: 0, brokenIds: [], valid: true };

    // Walk from oldest to newest
    const ordered = [...logs].reverse();
    for (const entry of ordered) {
      const expected = this.computeHash(entry, entry.prevHash ?? null);
      if (expected !== entry.entryHash) {
        report.broken++;
        report.brokenIds.push(entry.id);
      }
    }

    report.valid = report.broken === 0;
    return report;
  }

  /** Delete entries older than retentionDays. */
  async pruneOldEntries(retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
    const result = await this.auditRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoff', { cutoff })
      .execute();
    const deleted = result.affected ?? 0;
    this.logger.info(`Audit pruned ${deleted} entries older than ${retentionDays} days`);
    return deleted;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private computeHash(entry: Partial<AuditLog>, prevHash: string | null): string {
    const canonical = JSON.stringify({
      userId: entry.userId,
      action: entry.action,
      success: entry.success,
      metadata: entry.metadata,
      prevHash,
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  private redactPii(metadata: Record<string, any>): Record<string, any> {
    const piiKeys = ['email', 'phone', 'password', 'ssn', 'dob', 'address'];
    const result = { ...metadata };
    for (const key of piiKeys) {
      if (key in result) result[key] = '[REDACTED]';
    }
    return result;
  }
}
