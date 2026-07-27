/**
 * Recommendation Feedback-Loop Service (Issue #631)
 *
 * Captures implicit (view/dwell/complete) and explicit (rating/dismiss) signals,
 * feeds them into recommendation scoring with exponential time-decay, and
 * provides an offline precision@k evaluation harness against held-out data.
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RecommendationSignal, SignalType } from './recommendation-signal.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from '../courses/course.entity';

// ── Scoring weights ────────────────────────────────────────────────────────

const SIGNAL_BASE_WEIGHTS: Record<SignalType, number> = {
  [SignalType.COMPLETE]: 10,
  [SignalType.RATING]: 4,   // multiplied by value (1-5) → max 20
  [SignalType.CLICK]: 2,
  [SignalType.DWELL]: 1,    // multiplied by log(seconds+1)
  [SignalType.VIEW]: 0.5,
  [SignalType.DISMISS]: -5,
};

/** Half-life in days — signals halve in weight every 30 days */
const DECAY_HALF_LIFE_DAYS = 30;

export interface RecSignal {
  userId: string;
  courseId: string;
  signalType: SignalType;
  value?: number;
  consentGranted?: boolean;
}

export interface PrecisionAtKResult {
  k: number;
  precisionAtK: number;
  coverage: number;
  testedUsers: number;
}

@Injectable()
export class RecommendationSignalsService {
  private readonly logger = new Logger(RecommendationSignalsService.name);
  private readonly CACHE_TTL = 3600; // seconds

  constructor(
    @InjectRepository(RecommendationSignal)
    private readonly signalRepo: Repository<RecommendationSignal>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  // ── Signal ingestion ───────────────────────────────────────────────────────

  /**
   * Record a single recommendation signal.
   * Respects privacy — if consentGranted is false the signal is stored but
   * excluded from scoring.
   */
  async record(signal: RecSignal): Promise<void> {
    const { userId, courseId, signalType, value = 1, consentGranted = true } = signal;

    await this.signalRepo.save(
      this.signalRepo.create({
        userId,
        courseId,
        signalType,
        value,
        consentGranted,
      }),
    );

    // Bust the recommendation cache for this user
    await this.cache.del(`recommendations:${userId}`);
    await this.cache.del(`rec:scores:${userId}`);
  }

  // ── Scoring ────────────────────────────────────────────────────────────────

  /**
   * Compute signal-weighted scores for all courses a user has NOT enrolled in.
   * Scores incorporate time-decay so stale signals contribute less.
   *
   * Returns a map of courseId → score, sorted descending.
   */
  async computeUserScores(userId: string): Promise<Map<string, number>> {
    const cacheKey = `rec:scores:${userId}`;
    const cached = await this.cache.get<[string, number][]>(cacheKey);
    if (cached) return new Map(cached);

    // Load all signals for this user that have consent
    const signals = await this.signalRepo.find({
      where: { userId, consentGranted: true },
      order: { createdAt: 'DESC' },
    });

    // Load enrolled course IDs (to exclude from recommendations)
    const enrollments = await this.enrollmentRepo.find({
      where: { userId },
      select: ['courseId'],
    });
    const enrolledIds = new Set(enrollments.map((e) => e.courseId));

    const now = Date.now();
    const scores = new Map<string, number>();

    for (const sig of signals) {
      if (enrolledIds.has(sig.courseId)) continue; // skip enrolled

      const ageMs = now - new Date(sig.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const decayFactor = Math.pow(0.5, ageDays / DECAY_HALF_LIFE_DAYS);

      const baseWeight = SIGNAL_BASE_WEIGHTS[sig.signalType] ?? 0;
      let contribution: number;

      if (sig.signalType === SignalType.DWELL) {
        contribution = baseWeight * Math.log1p(sig.value) * decayFactor;
      } else if (sig.signalType === SignalType.RATING) {
        contribution = baseWeight * sig.value * decayFactor;
      } else {
        contribution = baseWeight * decayFactor;
      }

      scores.set(sig.courseId, (scores.get(sig.courseId) ?? 0) + contribution);
    }

    // Sort descending
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    await this.cache.set(cacheKey, sorted, this.CACHE_TTL);
    return new Map(sorted);
  }

  /**
   * Get signal-scored course recommendations for a user, limited to published courses.
   */
  async getSignalRecommendations(userId: string, limit = 10): Promise<Course[]> {
    const scores = await this.computeUserScores(userId);
    if (!scores.size) return [];

    const topIds = [...scores.keys()].slice(0, limit);
    if (!topIds.length) return [];

    const courses = await this.courseRepo.findByIds(topIds);
    const published = courses.filter((c) => c.isPublished && !c.isDeleted);

    // Maintain score order
    const idxMap = new Map(topIds.map((id, i) => [id, i]));
    return published.sort((a, b) => (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0));
  }

  // ── Offline evaluation ─────────────────────────────────────────────────────

  /**
   * Precision@k harness.
   *
   * Splits users' signal history into:
   *   - train: signals older than holdoutDays
   *   - test:  signals within the last holdoutDays
   *
   * Then checks what fraction of top-k recommendations appear in the test set.
   */
  async evaluatePrecisionAtK(k = 10, holdoutDays = 7): Promise<PrecisionAtKResult> {
    const holdoutCutoff = new Date(Date.now() - holdoutDays * 24 * 60 * 60 * 1000);

    // Users with at least one signal in the holdout window
    const testUsers = await this.signalRepo
      .createQueryBuilder('sig')
      .select('sig.userId', 'userId')
      .where('sig.createdAt >= :cutoff', { cutoff: holdoutCutoff })
      .andWhere('sig.consentGranted = true')
      .groupBy('sig.userId')
      .getRawMany<{ userId: string }>();

    if (!testUsers.length) {
      return { k, precisionAtK: 0, coverage: 0, testedUsers: 0 };
    }

    let totalPrecision = 0;
    let usersEvaluated = 0;

    for (const { userId } of testUsers) {
      // Ground truth: courses interacted with in holdout window (positive signals)
      const testSignals = await this.signalRepo.find({
        where: {
          userId,
          consentGranted: true,
          createdAt: MoreThan(holdoutCutoff),
        },
        select: ['courseId', 'signalType'],
      });

      const positiveSignals = testSignals.filter(
        (s) => s.signalType !== SignalType.DISMISS,
      );
      if (!positiveSignals.length) continue;

      const groundTruth = new Set(positiveSignals.map((s) => s.courseId));

      // Score using only train signals (before holdout)
      const trainSignals = await this.signalRepo.find({
        where: { userId, consentGranted: true },
        order: { createdAt: 'ASC' },
      });

      const trainCutoff = holdoutCutoff;
      const filteredTrain = trainSignals.filter((s) => s.createdAt < trainCutoff);

      const tempScores = new Map<string, number>();
      const now = Date.now();
      for (const sig of filteredTrain) {
        const ageMs = now - new Date(sig.createdAt).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        const decay = Math.pow(0.5, ageDays / DECAY_HALF_LIFE_DAYS);
        const base = SIGNAL_BASE_WEIGHTS[sig.signalType] ?? 0;
        const contrib = sig.signalType === SignalType.DWELL
          ? base * Math.log1p(sig.value) * decay
          : sig.signalType === SignalType.RATING
            ? base * sig.value * decay
            : base * decay;
        tempScores.set(sig.courseId, (tempScores.get(sig.courseId) ?? 0) + contrib);
      }

      const topK = [...tempScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, k)
        .map(([courseId]) => courseId);

      if (!topK.length) continue;

      const hits = topK.filter((id) => groundTruth.has(id)).length;
      totalPrecision += hits / k;
      usersEvaluated += 1;
    }

    const precisionAtK = usersEvaluated > 0 ? totalPrecision / usersEvaluated : 0;
    const coverage = usersEvaluated / testUsers.length;

    return { k, precisionAtK, coverage, testedUsers: usersEvaluated };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Delete signals for a user (GDPR right-to-erasure).
   */
  async deleteUserSignals(userId: string): Promise<void> {
    await this.signalRepo.delete({ userId });
    await this.cache.del(`rec:scores:${userId}`);
    await this.cache.del(`recommendations:${userId}`);
  }
}
