import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from './analytics-event.entity';
import { scrubPII, canSendEvent, ConsentState } from './event-taxonomy';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private consentStates: Map<string, ConsentState> = new Map();

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepo: Repository<AnalyticsEvent>,
  ) {}

  /**
   * Set user consent for analytics
   */
  setConsent(userId: string, consent: ConsentState): void {
    this.consentStates.set(userId, consent);
  }

  /**
   * Get user consent for analytics
   */
  getConsent(userId: string): ConsentState {
    return this.consentStates.get(userId) ?? { analytics: true, marketing: false };
  }

  /**
   * Clear consent (e.g., on logout)
   */
  clearConsent(userId: string): void {
    this.consentStates.delete(userId);
  }

  @OnEvent('*')
  async handleEvent(event: string, payload: any): Promise<void> {
    try {
      const userId = payload.userId;
      
      // Check consent if userId is provided
      if (userId) {
        const consent = this.getConsent(userId);
        if (!canSendEvent(consent, event)) {
          this.logger.debug(`Event ${event} blocked due to consent`);
          return;
        }
      }

      // Scrub PII from payload
      const scrubbedPayload = scrubPII(payload);
      
      const analyticsEvent = this.analyticsEventRepo.create({
        eventType: event,
        payload: JSON.stringify(scrubbedPayload),
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