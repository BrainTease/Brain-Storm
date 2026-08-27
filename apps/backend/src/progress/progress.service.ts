import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Progress } from './progress.entity';
import { RecordProgressDto } from './dto/record-progress.dto';
import { StellarService } from '../stellar/stellar.service';
import { BadgeAwardService } from '../credentials/badge-award.service';
import {
  PROGRESS_REPOSITORY_TOKEN,
} from '../repositories/repositories.module';
import { ProgressRepository } from '../repositories/progress-repository.interface';

/**
 * ProgressService
 *
 * All database access is delegated to ProgressRepository (#800).
 *
 * Badge/credential award on course completion is delegated to BadgeAwardService
 * (#818) — this service no longer owns CredentialsService or the referral-reward
 * minting logic.
 */
@Injectable()
export class ProgressService {
  constructor(
    @Inject(PROGRESS_REPOSITORY_TOKEN)
    private readonly progressRepository: ProgressRepository,
    private readonly stellarService: StellarService,
    private readonly badgeAwardService: BadgeAwardService,
  ) {}

  async record(
    userId: string,
    dto: RecordProgressDto,
    stellarPublicKey: string
  ): Promise<Progress> {
    let progress = await this.progressRepository.findByUserAndCourse(userId, dto.courseId);

    if (!progress) {
      progress = { userId, courseId: dto.courseId } as Progress;
    }

    progress.lessonId = dto.lessonId ?? progress.lessonId;
    progress.progressPct = dto.progressPct;

    if (dto.progressPct >= 100) {
      progress.completedAt = new Date();
    }

    // Record on-chain (non-fatal — store off-chain if it fails)
    try {
      const txHash = await this.stellarService.recordProgress(
        stellarPublicKey,
        dto.courseId,
        dto.progressPct
      );
      progress.txHash = txHash;
    } catch {
      // Non-fatal: on-chain failure does not block persistence
    }

    const saved = await this.progressRepository.save(progress);

    // Auto-issue credential + referral reward at 100 % — delegated to
    // BadgeAwardService (#818) so the logic lives in one place.
    if (dto.progressPct >= 100) {
      await this.badgeAwardService.awardOnCompletion(userId, dto.courseId, stellarPublicKey);
    }

    return saved;
  }

  async findByCourse(userId: string, courseId: string): Promise<Progress> {
    const progress = await this.progressRepository.findByUserAndCourse(userId, courseId);
    if (!progress) throw new NotFoundException('Progress not found');
    return progress;
  }

  findByUser(userId: string): Promise<Progress[]> {
    return this.progressRepository.findByUser(userId);
  }
}
