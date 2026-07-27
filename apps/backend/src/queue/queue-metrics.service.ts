import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Gauge, Counter, register } from 'prom-client';
import {
  QUEUE_EMAIL,
  QUEUE_NOTIFICATION,
  QUEUE_CERTIFICATE,
  QUEUE_INDEXING,
} from './queue.constants';

@Injectable()
export class QueueMetricsService implements OnModuleInit {
  private readonly logger = new Logger(QueueMetricsService.name);
  private readonly queues: Map<string, Queue>;

  private readonly queueDepthGauge: Gauge<string>;
  private readonly queueFailedCounter: Counter<string>;

  constructor(
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATION) private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_CERTIFICATE) private readonly certificateQueue: Queue,
    @InjectQueue(QUEUE_INDEXING) private readonly indexingQueue: Queue,
  ) {
    this.queues = new Map([
      [QUEUE_EMAIL, emailQueue],
      [QUEUE_NOTIFICATION, notificationQueue],
      [QUEUE_CERTIFICATE, certificateQueue],
      [QUEUE_INDEXING, indexingQueue],
    ]);

    // Register Prometheus metrics (guard against double registration in hot-reload)
    this.queueDepthGauge =
      (register.getSingleMetric('bullmq_queue_depth') as Gauge<string>) ??
      new Gauge({
        name: 'bullmq_queue_depth',
        help: 'BullMQ queue depth by queue name and state',
        labelNames: ['queue', 'state'],
        registers: [register],
      });

    this.queueFailedCounter =
      (register.getSingleMetric('bullmq_job_failed_total') as Counter<string>) ??
      new Counter({
        name: 'bullmq_job_failed_total',
        help: 'Total number of failed BullMQ jobs',
        labelNames: ['queue', 'job'],
        registers: [register],
      });
  }

  onModuleInit() {
    // Refresh Prometheus gauges every 15 seconds
    setInterval(() => this.refreshMetrics(), 15_000);
  }

  async refreshMetrics(): Promise<void> {
    for (const [name, queue] of this.queues.entries()) {
      try {
        const counts = await queue.getJobCounts();
        this.queueDepthGauge.set({ queue: name, state: 'waiting' }, counts.waiting ?? 0);
        this.queueDepthGauge.set({ queue: name, state: 'active' }, counts.active ?? 0);
        this.queueDepthGauge.set({ queue: name, state: 'failed' }, counts.failed ?? 0);
        this.queueDepthGauge.set({ queue: name, state: 'delayed' }, counts.delayed ?? 0);
        this.queueDepthGauge.set({ queue: name, state: 'completed' }, counts.completed ?? 0);
      } catch (err: any) {
        this.logger.warn(`Failed to refresh metrics for queue ${name}: ${err.message}`);
      }
    }
  }

  /** Call this from worker @OnWorkerEvent('failed') handlers */
  incrementFailed(queueName: string, jobName: string): void {
    this.queueFailedCounter.inc({ queue: queueName, job: jobName });
  }
}
