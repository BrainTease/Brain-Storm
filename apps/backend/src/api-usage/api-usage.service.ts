import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiUsageLog } from './api-usage-log.entity';

@Injectable()
export class ApiUsageService {
  constructor(
    @InjectRepository(ApiUsageLog) private logRepo: Repository<ApiUsageLog>,
  ) {}

  async log(data: Partial<ApiUsageLog>): Promise<void> {
    await this.logRepo.save(this.logRepo.create(data));
  }

  async getAggregatedByEndpoint(from: Date, to: Date) {
    return this.logRepo
      .createQueryBuilder('log')
      .select('log.endpoint', 'endpoint')
      .addSelect('log.method', 'method')
      .addSelect('COUNT(*)', 'requestCount')
      .addSelect('AVG(log.responseTimeMs)', 'avgResponseTimeMs')
      .addSelect('SUM(CASE WHEN log.statusCode >= 400 THEN 1 ELSE 0 END)', 'errorCount')
      .where('log.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('log.endpoint')
      .addGroupBy('log.method')
      .orderBy('"requestCount"', 'DESC')
      .getRawMany();
  }

  async getAggregatedByUser(from: Date, to: Date) {
    return this.logRepo
      .createQueryBuilder('log')
      .select('log.userId', 'userId')
      .addSelect('COUNT(*)', 'requestCount')
      .addSelect('AVG(log.responseTimeMs)', 'avgResponseTimeMs')
      .where('log.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('log.userId IS NOT NULL')
      .groupBy('log.userId')
      .orderBy('"requestCount"', 'DESC')
      .getRawMany();
  }

  async getAggregatedByTime(from: Date, to: Date, granularity: 'hour' | 'day' = 'hour') {
    const trunc = granularity === 'hour' ? 'hour' : 'day';
    return this.logRepo
      .createQueryBuilder('log')
      .select(`DATE_TRUNC('${trunc}', log.createdAt)`, 'period')
      .addSelect('COUNT(*)', 'requestCount')
      .where('log.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();
  }

  async getDashboard(from: Date, to: Date) {
    const [byEndpoint, byUser, byTime, totals] = await Promise.all([
      this.getAggregatedByEndpoint(from, to),
      this.getAggregatedByUser(from, to),
      this.getAggregatedByTime(from, to, 'day'),
      this.logRepo
        .createQueryBuilder('log')
        .select('COUNT(*)', 'totalRequests')
        .addSelect('AVG(log.responseTimeMs)', 'avgResponseTimeMs')
        .addSelect('SUM(CASE WHEN log.statusCode >= 400 THEN 1 ELSE 0 END)', 'totalErrors')
        .where('log.createdAt BETWEEN :from AND :to', { from, to })
        .getRawOne(),
    ]);

    return { totals, byEndpoint: byEndpoint.slice(0, 20), byUser: byUser.slice(0, 20), byTime };
  }

  async checkUsageAlerts(thresholdPerMinute = 100): Promise<{ alert: boolean; count: number }> {
    const since = new Date(Date.now() - 60_000);
    const count = await this.logRepo
      .createQueryBuilder('log')
      .where('log.createdAt > :since', { since })
      .getCount();
    return { alert: count > thresholdPerMinute, count };
  }

  async getUserRequestCount(userId: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return this.logRepo
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.createdAt > :since', { since })
      .getCount();
  }
}
