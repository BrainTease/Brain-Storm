import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProtocolMetric, MetricInterval } from './protocol-metrics.entity';
import { AnalyticsEvent } from './analytics-event.entity';

type BucketRow = {
  bucket: Date;
  value: string;
  dimension: string | null;
};

@Injectable()
export class ProtocolMetricsService {
  private readonly logger = new Logger(ProtocolMetricsService.name);

  constructor(
    @InjectRepository(ProtocolMetric)
    private readonly metricsRepo: Repository<ProtocolMetric>,
    @InjectRepository(AnalyticsEvent)
    private readonly eventsRepo: Repository<AnalyticsEvent>,
  ) {}

  // ─── Aggregation jobs ────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async aggregateHourly() {
    await this.aggregate('hour');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDaily() {
    await this.aggregate('day');
  }

  /** Called on startup and by cron to keep buckets fresh. */
  async aggregate(interval: MetricInterval = 'day'): Promise<void> {
    this.logger.log(`Aggregating protocol metrics (${interval})`);
    const pgTrunc = interval === 'hour' ? 'hour' : interval === 'day' ? 'day' : 'week';

    await Promise.all([
      this.upsertBuckets('registrations', interval, pgTrunc, this.queryRegistrations(pgTrunc)),
      this.upsertBuckets('tip_volume', interval, pgTrunc, this.queryTipVolume(pgTrunc)),
      this.upsertBuckets('escrow_throughput', interval, pgTrunc, this.queryEscrowThroughput(pgTrunc)),
      this.upsertBuckets('dispute_outcomes', interval, pgTrunc, this.queryDisputeOutcomes(pgTrunc)),
    ]);
  }

  // ─── Query helpers ────────────────────────────────────────────────────────

  private queryRegistrations(trunc: string): Promise<BucketRow[]> {
    return this.eventsRepo
      .createQueryBuilder('e')
      .select(`DATE_TRUNC('${trunc}', e.timestamp)`, 'bucket')
      .addSelect('COUNT(*)', 'value')
      .addSelect("NULL::text", 'dimension')
      .where(`e.eventType IN ('user.registered', 'stellar.registration')`)
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<BucketRow>();
  }

  private queryTipVolume(trunc: string): Promise<BucketRow[]> {
    return this.eventsRepo
      .createQueryBuilder('e')
      .select(`DATE_TRUNC('${trunc}', e.timestamp)`, 'bucket')
      .addSelect(`COALESCE(SUM((e.payload::jsonb->>'amount')::numeric), 0)`, 'value')
      .addSelect(`COALESCE(e.payload::jsonb->>'asset', 'XLM')`, 'dimension')
      .where(`e.eventType = 'token.transfer'`)
      .groupBy('bucket, dimension')
      .orderBy('bucket', 'ASC')
      .getRawMany<BucketRow>();
  }

  private queryEscrowThroughput(trunc: string): Promise<BucketRow[]> {
    return this.eventsRepo
      .createQueryBuilder('e')
      .select(`DATE_TRUNC('${trunc}', e.timestamp)`, 'bucket')
      .addSelect('COUNT(*)', 'value')
      .addSelect("NULL::text", 'dimension')
      .where(`e.eventType IN ('escrow.created', 'escrow.released', 'escrow.refunded')`)
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<BucketRow>();
  }

  private queryDisputeOutcomes(trunc: string): Promise<BucketRow[]> {
    return this.eventsRepo
      .createQueryBuilder('e')
      .select(`DATE_TRUNC('${trunc}', e.timestamp)`, 'bucket')
      .addSelect('COUNT(*)', 'value')
      .addSelect(`COALESCE(e.payload::jsonb->>'outcome', 'unknown')`, 'dimension')
      .where(`e.eventType = 'dispute.resolved'`)
      .groupBy('bucket, dimension')
      .orderBy('bucket', 'ASC')
      .getRawMany<BucketRow>();
  }

  private async upsertBuckets(
    metric: string,
    interval: MetricInterval,
    _trunc: string,
    rowsPromise: Promise<BucketRow[]>,
  ): Promise<void> {
    const rows = await rowsPromise;
    for (const row of rows) {
      await this.metricsRepo
        .createQueryBuilder()
        .insert()
        .into(ProtocolMetric)
        .values({
          metric,
          interval,
          bucketStart: row.bucket,
          value: Number(row.value),
          dimension: row.dimension ?? undefined,
        })
        .orUpdate(['value', 'aggregatedAt'], ['metric', 'interval', 'bucketStart'])
        .execute();
    }
  }

  // ─── Query API ────────────────────────────────────────────────────────────

  async getTimeSeries(options: {
    metric: string;
    interval?: MetricInterval;
    from?: Date;
    to?: Date;
    dimension?: string;
  }): Promise<{ series: ProtocolMetric[]; lastAggregatedAt: Date | null }> {
    const { metric, interval = 'day', from, to, dimension } = options;

    const qb = this.metricsRepo
      .createQueryBuilder('m')
      .where('m.metric = :metric', { metric })
      .andWhere('m.interval = :interval', { interval })
      .orderBy('m.bucketStart', 'ASC');

    if (from) qb.andWhere('m.bucketStart >= :from', { from });
    if (to) qb.andWhere('m.bucketStart <= :to', { to });
    if (dimension) qb.andWhere('m.dimension = :dimension', { dimension });

    const series = await qb.getMany();

    const latest = await this.metricsRepo
      .createQueryBuilder('m')
      .select('MAX(m.aggregatedAt)', 'ts')
      .where('m.metric = :metric', { metric })
      .getRawOne<{ ts: string }>();

    return {
      series,
      lastAggregatedAt: latest?.ts ? new Date(latest.ts) : null,
    };
  }

  async getSummary(): Promise<{
    registrations: number;
    tipVolumeXlm: number;
    escrowThroughput: number;
    disputeResolved: number;
    lastAggregatedAt: Date | null;
  }> {
    const sum = (metric: string, dimension?: string) => {
      const qb = this.metricsRepo
        .createQueryBuilder('m')
        .select('COALESCE(SUM(m.value), 0)', 'total')
        .where('m.metric = :metric AND m.interval = :interval', { metric, interval: 'day' });
      if (dimension) qb.andWhere('m.dimension = :dimension', { dimension });
      return qb.getRawOne<{ total: string }>().then((r) => Number(r?.total ?? 0));
    };

    const [registrations, tipVolumeXlm, escrowThroughput, disputeResolved] = await Promise.all([
      sum('registrations'),
      sum('tip_volume', 'XLM'),
      sum('escrow_throughput'),
      sum('dispute_outcomes'),
    ]);

    const latest = await this.metricsRepo
      .createQueryBuilder('m')
      .select('MAX(m.aggregatedAt)', 'ts')
      .getRawOne<{ ts: string }>();

    return {
      registrations,
      tipVolumeXlm,
      escrowThroughput,
      disputeResolved,
      lastAggregatedAt: latest?.ts ? new Date(latest.ts) : null,
    };
  }
}
