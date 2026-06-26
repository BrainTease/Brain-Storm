import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as AdmZip from 'adm-zip';
import { User } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private auditService: AuditService,
  ) {}

  /**
   * Build a ZIP archive containing all off-chain personal data for `userId`.
   * Returns the archive buffer for streaming to the client.
   */
  async exportUserData(userId: string, ipAddress?: string): Promise<Buffer> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const zip = new AdmZip();

    // Profile data (strip sensitive fields)
    const profile = {
      id: user.id,
      email: user.email,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      stellarPublicKey: user.stellarPublicKey,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
    zip.addFile('profile.json', Buffer.from(JSON.stringify(profile, null, 2)));

    // On-chain data caveat
    const onChainNote = [
      'On-chain data (credentials, reputation scores, analytics progress) is',
      'stored immutably on the Stellar blockchain and cannot be deleted.',
      'You can view your on-chain records via the Stellar explorer using',
      `your public key: ${user.stellarPublicKey ?? '(not set)'}`,
    ].join('\n');
    zip.addFile('on_chain_notice.txt', Buffer.from(onChainNote));

    await this.auditService.log(
      'gdpr.export.requested',
      userId,
      true,
      { exportedAt: new Date().toISOString() },
      ipAddress,
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
    ipAddress?: string,
  ): Promise<{ success: boolean; onChainCaveat: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Erase all PII off-chain
    await this.userRepo.save({
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
    });

    await this.auditService.log(
      'gdpr.account.deleted',
      userId,
      true,
      { deletedAt: new Date().toISOString() },
      ipAddress,
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
