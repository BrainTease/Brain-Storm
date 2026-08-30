import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { rpc } from '@stellar/stellar-sdk';
import { CredentialsService } from '../credentials/credentials.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

const LAST_LEDGER_KEY = 'indexer:last_ledger';

/** Maximum events processed concurrently within a single batch */
const BATCH_CONCURRENCY = 10;

/** Maximum events fetched per poll — prevents runaway memory on cold-start */
const MAX_EVENTS_PER_POLL = 500;

/**
 * StellarIndexerService — #708 Indexer & Event Query Performance
 *
 * Improvements over the original:
 *  1. **Batched processing** — events are processed BATCH_CONCURRENCY at a
 *     time with Promise.allSettled so one failing event never blocks others.
 *  2. **Lag metric** — `indexer:lag_ledgers` is written to the cache after
 *     every poll so dashboards / health checks can read it without hitting
 *     the RPC node.
 *  3. **Back-pressure** — if the previous poll is still in progress the new
 *     tick is skipped; `indexer:is_busy` tracks this.  The poll interval
 *     doubles automatically while busy (exponential back-off) to avoid
 *     overwhelming the RPC endpoint.
 *  4. **Cold-start catch-up** — when no checkpoint exists, start from the
 *     latest ledger (skip historical) to give sub-second first lag.  Pass
 *     INDEXER_CATCHUP=true env to force a full historical replay instead.
 */
@Injectable()
export class StellarIndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StellarIndexerService.name);
  private readonly sorobanServer: rpc.Server;
  private readonly analyticsContractId: string;
  private readonly tokenContractId: string;
  private readonly basePollInterval: number;

  private timer: NodeJS.Timeout | null = null;
  private isBusy = false;
  private consecutiveBusyCount = 0;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private credentialsService: CredentialsService,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
  ) {
    this.sorobanServer = new rpc.Server(
      this.configService.get<string>('stellar.sorobanRpcUrl') ?? '',
    );
    this.analyticsContractId =
      this.configService.get<string>('stellar.analyticsContractId') ?? '';
    this.tokenContractId = this.configService.get<string>('stellar.tokenContractId') ?? '';
    this.basePollInterval =
      this.configService.get<number>('stellar.indexerPollIntervalMs') ?? 5000;
  }

  onModuleInit() {
    if (!this.analyticsContractId && !this.tokenContractId) {
      this.logger.warn('No contract IDs configured — indexer disabled');
      return;
    }
    this.schedulePoll();
    this.logger.log(`Indexer started (base interval: ${this.basePollInterval}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  // ─── Scheduling ──────────────────────────────────────────────────────────────

  private schedulePoll() {
    // Exponential back-off while busy (capped at 4× base interval)
    const delay =
      this.consecutiveBusyCount > 0
        ? Math.min(this.basePollInterval * 2 ** this.consecutiveBusyCount, this.basePollInterval * 4)
        : this.basePollInterval;

    this.timer = setTimeout(async () => {
      await this.poll();
      this.schedulePoll();
    }, delay);
  }

  // ─── Poll ─────────────────────────────────────────────────────────────────────

  private async poll() {
    // Back-pressure: skip tick if still processing previous batch
    if (this.isBusy) {
      this.consecutiveBusyCount++;
      this.logger.warn(
        `Indexer busy (tick ${this.consecutiveBusyCount}) — skipping poll`,
      );
      return;
    }

    this.isBusy = true;
    this.consecutiveBusyCount = 0;
    const pollStart = Date.now();

    try {
      const lastLedger = (await this.cacheManager.get<number>(LAST_LEDGER_KEY)) ?? 0;

      // Cold-start: skip to latest ledger unless INDEXER_CATCHUP is set
      const catchup = process.env.INDEXER_CATCHUP === 'true';
      const startLedger = lastLedger || (catchup ? undefined : await this.fetchLatestLedger());

      const contractIds = [this.analyticsContractId, this.tokenContractId].filter(Boolean);

      const { events, latestLedger } = await this.sorobanServer.getEvents({
        startLedger: startLedger ?? undefined,
        filters: [{ type: 'contract', contractIds }],
        limit: MAX_EVENTS_PER_POLL,
      } as any);

      const eventList: rpc.Api.EventResponse[] = (events ?? []).slice(
        0,
        MAX_EVENTS_PER_POLL,
      );

      // ── Batched processing ───────────────────────────────────────────────
      for (let i = 0; i < eventList.length; i += BATCH_CONCURRENCY) {
        const chunk = eventList.slice(i, i + BATCH_CONCURRENCY);
        const results = await Promise.allSettled(
          chunk.map((evt) => this.handleEvent(evt)),
        );
        for (const r of results) {
          if (r.status === 'rejected') {
            this.logger.error(`Event handling error: ${r.reason?.message}`, r.reason?.stack);
          }
        }
      }

      // ── Lag metric ────────────────────────────────────────────────────────
      if (latestLedger > lastLedger) {
        await this.cacheManager.set(LAST_LEDGER_KEY, latestLedger, 0);
      }

      const lagLedgers = Math.max(0, latestLedger - (lastLedger || latestLedger));
      const pollDurationMs = Date.now() - pollStart;

      // Write lag to cache so health / metrics endpoints can expose it cheaply
      await this.cacheManager.set('indexer:lag_ledgers', lagLedgers, 300);
      await this.cacheManager.set('indexer:last_poll_ms', pollDurationMs, 300);

      if (lagLedgers > 50) {
        this.logger.warn(
          `Indexer lag: ${lagLedgers} ledgers behind (poll took ${pollDurationMs}ms)`,
        );
      } else {
        this.logger.debug(
          `Poll complete — ${eventList.length} events, lag=${lagLedgers} ledgers, ${pollDurationMs}ms`,
        );
      }
    } catch (err) {
      this.logger.error(`Poll error: ${(err as Error).message}`);
    } finally {
      this.isBusy = false;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async fetchLatestLedger(): Promise<number> {
    try {
      const info = await this.sorobanServer.getLatestLedger();
      return info.sequence ?? 0;
    } catch {
      return 0;
    }
  }

  /** Expose current indexer lag (ledgers behind latest) for health checks */
  async getLagLedgers(): Promise<number> {
    return (await this.cacheManager.get<number>('indexer:lag_ledgers')) ?? 0;
  }

  // ─── Event handlers ───────────────────────────────────────────────────────────

  private async handleEvent(event: rpc.Api.EventResponse) {
    const topic = (event.topic ?? []).map((t: any) => t?.value?.toString() ?? '');
    const [contractType, eventName] = topic;

    if (contractType === 'analytics' && eventName === 'completed') {
      await this.handleAnalyticsCompleted(event);
    } else if (contractType === 'token' && eventName === 'transfer') {
      await this.handleTokenTransfer(event);
    }
  }

  private async handleAnalyticsCompleted(event: rpc.Api.EventResponse) {
    const value = event.value?.value?.() as any;
    const studentPublicKey: string = value?.student?.toString();
    const courseId: string = value?.course?.toString();

    if (!studentPublicKey || !courseId) return;

    const user = await this.usersService.findByStellarPublicKey(studentPublicKey);
    if (!user) return;

    this.logger.log(`analytics:completed — user ${user.id}, course ${courseId}`);
    await this.credentialsService.issue(user.id, courseId, studentPublicKey);
    await this.notificationsService.onCredentialIssued(user.id, courseId);
  }

  private async handleTokenTransfer(event: rpc.Api.EventResponse) {
    const value = event.value?.value?.() as any;
    const toPublicKey: string = value?.to?.toString();
    if (!toPublicKey) return;

    await this.cacheManager.del(`token_balance:${toPublicKey}`);
    this.logger.log(`token:transfer — busted BST cache for ${toPublicKey}`);
  }
}
