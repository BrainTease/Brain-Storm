import { Injectable, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { AnalyticsEvent } from './analytics-event.entity';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepo: Repository<AnalyticsEvent>,
  ) {}

  @OnEvent('*')
  async handleEvent(event: string, payload: any): Promise<void> {
    try {
      const analyticsEvent = this.analyticsEventRepo.create({
        eventType: event,
        payload: JSON.stringify(payload),
        // We can try to extract userId and courseId from payload if they exist
        userId: payload.userId ?? null,
        courseId: payload.courseId ?? null,
      });

      await this.analyticsEventRepo.save(analyticsEvent);
      this.logger.debug(`Stored analytics event: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to store analytics event ${event}:`, error);
    }
  }

  async findEvents(
    options: {
      limit?: number;
      offset?: number;
      eventType?: string;
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      courseId?: string;
    } = {},
  ): Promise<[AnalyticsEvent[], number]> {
    const queryBuilder = this.analyticsEventRepo.createQueryBuilder('event');

    if (options.eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', { eventType: options.eventType });
    }
    if (options.userId) {
      queryBuilder.andWhere('event.userId = :userId', { userId: options.userId });
    }
    if (options.courseId) {
      queryBuilder.andWhere('event.courseId = :courseId', { courseId: options.courseId });
    }
    if (options.startDate) {
      queryBuilder.andWhere('event.timestamp >= :startDate', { startDate: options.startDate });
    }
    if (options.endDate) {
      queryBuilder.andWhere('event.timestamp <= :endDate', { endDate: options.endDate });
    }

    queryBuilder.orderBy('event.timestamp', 'DESC');

    if (options.limit) {
      queryBuilder.take(options.limit);
    }
    if (options.offset) {
      queryBuilder.skip(options.offset);
    }

    const [events, total] = await queryBuilder.getManyAndCount();
    return [events, total];
  }
}