import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Progress } from './progress.entity';
import { RecordProgressDto } from './dto/record-progress.dto';
import { StellarService } from '../stellar/stellar.service';
import { CredentialsService } from '../credentials/credentials.service';
import { UsersService } from '../users/users.service';
import {
  PROGRESS_REPOSITORY_TOKEN,
} from '../repositories/repositories.module';
import { ProgressRepository } from '../repositories/progress-repository.interface';

/**
 * ProgressService
 *
 * All database access is delegated to ProgressRepository (#800).
 * No direct @InjectRepository(Progress) — the repository abstraction
 * is the single seam for progress query logic.
 */
@Injectable()
export class ProgressService {
  constructor(
    @Inject(PROGRESS_REPOSITORY_TOKEN)
    private readonly progressRepository: ProgressRepository,
    private readonly stellarService: StellarService,
    private readonly credentialsService: CredentialsService,
    private readonly usersService: UsersService,
  ) {}

  async record(userId: string, dto: RecordProgressDto, stellarPublicKey: string): Promise<Progress> {
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
        dto.progressPct,
      );
      progress.txHash = txHash;
    } catch {
      // Non-fatal: on-chain failure does not block persistence
    }

    const saved = await this.progressRepository.save(progress);

    // Auto-issue credential at 100 %
    if (dto.progressPct >= 100) {
      await this.credentialsService.issue(userId, dto.courseId, stellarPublicKey);

      // Mint 50 BST to referrer on first course completion
      const completedCount = await this.progressRepository.countCompletedByUser(userId);
      if (completedCount === 1) {
        const user = await this.usersService.findById(userId);
        if (user?.referredBy) {
          const referrer = await this.usersService.findById(user.referredBy);
          if (referrer?.stellarPublicKey) {
            try {
              await this.stellarService.mintReward(referrer.stellarPublicKey, 50);
            } catch {
              // Non-fatal
            }
          }
        }
      }
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
