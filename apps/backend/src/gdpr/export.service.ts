import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as AdmZip from 'adm-zip';
import { User } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';
import { GdprPartialFailureError, GdprTotalFailureError, runGdprModules } from './gdpr-errors';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private auditService: AuditService
  ) {}

  /**
   * Build a ZIP archive containing all off-chain personal data for `userId`.
   * Returns the archive buffer for streaming to the client.
   */
  async exportUserData(userId: string, ipAddress?: string): Promise<Buffer> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const zip = new AdmZip();

    const { results, failures } = await runGdprModules([
      {
        name: 'profile',
        run: async () => ({
          id: user.id,
          email: user.email,
          username: user.username,
          bio: user.bio,
          avatar: user.avatar,
          stellarPublicKey: user.stellarPublicKey,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        }),
      },
      {
        name: 'on_chain_notice',
        run: async () =>
          [
            'On-chain data (credentials, reputation scores, analytics progress) is',
            'stored immutably on the Stellar blockchain and cannot be deleted.',
            'You can view your on-chain records via the Stellar explorer using',
            `your public key: ${user.stellarPublicKey ?? '(not set)'}`,
          ].join('\n'),
      },
    ]);

    for (const result of results) {
      if (result.module === 'profile') {
        zip.addFile('profile.json', Buffer.from(JSON.stringify(result.data, null, 2)));
      } else if (result.module === 'on_chain_notice') {
        zip.addFile('on_chain_notice.txt', Buffer.from(result.data as string));
      }
    }

    if (failures.length > 0) {
      zip.addFile(
        'partial_failure_report.json',
        Buffer.from(JSON.stringify({ failures, generatedAt: new Date().toISOString() }, null, 2))
      );
    }

    const succeededModules = results.map((r) => r.module);

    if (failures.length > 0 && results.length === 0) {
      await this.auditService.log(
        'gdpr.export.failed',
        userId,
        false,
        { failures },
        ipAddress
      );
      this.logger.error(`GDPR export failed completely for user ${userId}: ${JSON.stringify(failures)}`);
      throw new GdprTotalFailureError('export', userId, failures);
    }

    if (failures.length > 0) {
      await this.auditService.log(
        'gdpr.export.partial_failure',
        userId,
        false,
        { failures, succeededModules },
        ipAddress
      );
      this.logger.warn(
        `GDPR export partially failed for user ${userId}: ${JSON.stringify(failures)}`
      );
      // Surface the partial failure to the caller (who may still choose to
      // return zip.toBuffer() to the user alongside the error detail).
      throw new GdprPartialFailureError('export', userId, failures, succeededModules, zip.toBuffer());
    }

    await this.auditService.log(
      'gdpr.export.requested',
      userId,
      true,
      { exportedAt: new Date().toISOString(), succeededModules },
      ipAddress
    );

    this.logger.log(`GDPR export generated for user ${userId}`);
    return zip.toBuffer();
  }

  /**
   * Soft-delete the user and erase PII fields.
   * On-chain data is immutable and is documented in the response caveat.
   */
  async deleteAccount(
    userId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; onChainCaveat: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const { results, failures } = await runGdprModules([
      {
        name: 'profile_pii_erasure',
        run: async () =>
          this.userRepo.save({
            ...user,
            email: `deleted-${userId}@deleted.invalid`,
            username: null,
            passwordHash: '',
            avatar: null,
            bio: null,
            stellarPublicKey: null,
            verificationToken: null,
            mfaSecret: null,
            mfaBackupCodes: null,
            referralCode: null,
            referredBy: null,
            deletedAt: new Date(),
          }),
      },
    ]);

    const succeededModules = results.map((r) => r.module);

    if (failures.length > 0 && results.length === 0) {
      await this.auditService.log('gdpr.account.deletion_failed', userId, false, { failures }, ipAddress);
      this.logger.error(
        `GDPR account deletion failed completely for user ${userId}: ${JSON.stringify(failures)}`
      );
      throw new GdprTotalFailureError('deletion', userId, failures);
    }

    if (failures.length > 0) {
      await this.auditService.log(
        'gdpr.account.deletion_partial_failure',
        userId,
        false,
        { failures, succeededModules },
        ipAddress
      );
      this.logger.warn(
        `GDPR account deletion partially failed for user ${userId}: ${JSON.stringify(failures)}`
      );
      throw new GdprPartialFailureError('deletion', userId, failures, succeededModules);
    }

    await this.auditService.log(
      'gdpr.account.deleted',
      userId,
      true,
      { deletedAt: new Date().toISOString(), succeededModules },
      ipAddress
    );

    this.logger.log(`GDPR account deletion completed for user ${userId}`);

    return {
      success: true,
      onChainCaveat:
        'Off-chain PII has been erased. On-chain records (credentials, ' +
        'reputation scores, progress) stored on Stellar are immutable and ' +
        'cannot be deleted per blockchain design.',
    };
  }
}
