import { Injectable, Logger, Inject } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { StellarService } from '../stellar/stellar.service';
import { UsersService } from '../users/users.service';
import { ProgressRepository } from '../repositories/progress-repository.interface';
import { PROGRESS_REPOSITORY_TOKEN } from '../repositories/repositories.module';

/**
 * BadgeAwardService — issue #818
 *
 * ## Problem
 *
 * Badge / credential award logic was scattered across three separate call sites:
 *
 * | Call site                                | What it did                                       |
 * |------------------------------------------|---------------------------------------------------|
 * | `ProgressService.record()`               | Called `CredentialsService.issue()` at 100 %      |
 * | `CertificatesService.issueCertificate()` | Directly called `StellarService.issueCredential()`|
 * | `CredentialsService.issue()`             | Called `StellarService.issueCredential()` + mint  |
 *
 * This meant:
 * - Duplicate on-chain calls could occur if both `ProgressService` and
 *   `CertificatesService` were triggered for the same user/course.
 * - Referral-reward minting logic lived inside `ProgressService`, which has no
 *   business owning that concern.
 * - Tests had to mock the same chain of calls in multiple spec files.
 *
 * ## Solution
 *
 * `BadgeAwardService` is now the **single entry point** for awarding a badge or
 * credential on course completion.  Both `ProgressService` and
 * `CertificatesService` delegate here.
 *
 * Responsibilities:
 *  1. Idempotent credential issuance (delegates to `CredentialsService.issue()`,
 *     which already guards against duplicates).
 *  2. Referral-reward minting on a user's **first** completed course.
 *  3. Emitting a structured log on every successful or failed award.
 *
 * `CertificatesService` no longer calls `StellarService.issueCredential()`
 * directly — it calls `badgeAwardService.awardOnCompletion()` instead, ensuring
 * the de-duplication and referral logic runs in one place.
 */
@Injectable()
export class BadgeAwardService {
  private readonly logger = new Logger(BadgeAwardService.name);

  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly stellarService: StellarService,
    private readonly usersService: UsersService,
    @Inject(PROGRESS_REPOSITORY_TOKEN)
    private readonly progressRepository: ProgressRepository,
  ) {}

  /**
   * Award a credential/badge when a user completes a course.
   *
   * Safe to call multiple times for the same `(userId, courseId)` pair —
   * `CredentialsService.issue()` is idempotent and returns the existing record
   * if one already exists.
   *
   * @param userId           - ID of the user who completed the course.
   * @param courseId         - ID of the completed course.
   * @param stellarPublicKey - User's Stellar public key for on-chain operations.
   */
  async awardOnCompletion(
    userId: string,
    courseId: string,
    stellarPublicKey: string,
  ): Promise<void> {
    // 1. Issue the credential (idempotent; includes KYC gate and on-chain mint).
    try {
      await this.credentialsService.issue(userId, courseId, stellarPublicKey);
      this.logger.log(`Credential issued for user=${userId} course=${courseId}`);
    } catch (err) {
      this.logger.error(
        `Credential issuance failed for user=${userId} course=${courseId}: ${(err as Error).message}`,
      );
      // Re-throw so the caller can decide whether to surface the error.
      throw err;
    }

    // 2. Referral reward — mint 50 BST to the referrer on the user's FIRST
    //    course completion.  Non-fatal: a Stellar error here must not roll back
    //    the credential award.
    await this.maybeMintReferralReward(userId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async maybeMintReferralReward(userId: string): Promise<void> {
    try {
      const completedCount = await this.progressRepository.countCompletedByUser(userId);
      if (completedCount !== 1) {
        // Not the first completion — no referral reward.
        return;
      }

      const user = await this.usersService.findById(userId);
      if (!user?.referredBy) return;

      const referrer = await this.usersService.findById(user.referredBy);
      if (!referrer?.stellarPublicKey) return;

      await this.stellarService.mintReward(referrer.stellarPublicKey, 50);
      this.logger.log(
        `Referral reward minted: 50 BST → referrer=${referrer.id} for user=${userId}`,
      );
    } catch (err) {
      // Non-fatal: referral reward failure must not block the credential award.
      this.logger.warn(
        `Referral reward mint failed for user=${userId}: ${(err as Error).message}`,
      );
    }
  }
}
