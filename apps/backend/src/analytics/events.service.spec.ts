/**
 * #863 — Integration tests for EventsService (analytics ingestion pipeline).
 *
 * Covers:
 *   - setConsent / getConsent / clearConsent
 *   - handleEvent: PII scrubbing before persistence
 *   - handleEvent: consent-gated events blocked / allowed
 *   - handleEvent: storage errors are swallowed (no unhandled rejection)
 *   - findEvents: filter combinations (type, userId, courseId, date range, pagination)
 */

import { EventsService } from './events.service';
import { AnalyticsEvent } from './analytics-event.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';

// ─── mock helpers ─────────────────────────────────────────────────────────────

function makeRepo(): jest.Mocked<Repository<AnalyticsEvent>> {
  return {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(),
  } as any;
}

function buildService() {
  const repo = makeRepo();
  const service = new EventsService(repo);
  return { service, repo };
}

// ─── stub for chained query builder ──────────────────────────────────────────

function makeQb(results: [AnalyticsEvent[], number] = [[], 0]) {
  const qb: any = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(results),
  };
  return qb;
}

// ═════════════════════════════════════════════════════════════════════════════
// Consent management
// ═════════════════════════════════════════════════════════════════════════════

describe('EventsService — consent management', () => {
  it('returns default consent (analytics=true, marketing=false) for unknown user', () => {
    const { service } = buildService();
    const consent = service.getConsent('unknown-user');
    expect(consent).toEqual({ analytics: true, marketing: false });
  });

  it('stores and retrieves consent for a user', () => {
    const { service } = buildService();
    service.setConsent('u1', { analytics: true, marketing: true });
    expect(service.getConsent('u1')).toEqual({ analytics: true, marketing: true });
  });

  it('clears consent so the user falls back to defaults', () => {
    const { service } = buildService();
    service.setConsent('u1', { analytics: false, marketing: false });
    service.clearConsent('u1');
    expect(service.getConsent('u1')).toEqual({ analytics: true, marketing: false });
  });

  it('updating consent overwrites the previous value', () => {
    const { service } = buildService();
    service.setConsent('u1', { analytics: true, marketing: false });
    service.setConsent('u1', { analytics: true, marketing: true });
    expect(service.getConsent('u1').marketing).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// handleEvent — consent gating
// ═════════════════════════════════════════════════════════════════════════════

describe('EventsService — consent gating', () => {
  it('persists an analytics event when user has analytics consent', async () => {
    const { service, repo } = buildService();
    service.setConsent('u1', { analytics: true, marketing: false });

    await service.handleEvent('course_progress_update', { userId: 'u1', courseId: 'c1' });

    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('does NOT persist when analytics consent is false', async () => {
    const { service, repo } = buildService();
    service.setConsent('u1', { analytics: false, marketing: false });

    await service.handleEvent('course_progress_update', { userId: 'u1' });

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('blocks a marketing event when marketing consent is false', async () => {
    const { service, repo } = buildService();
    service.setConsent('u1', { analytics: true, marketing: false });

    await service.handleEvent('tip_initiated', { userId: 'u1' });

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('allows a marketing event when marketing consent is true', async () => {
    const { service, repo } = buildService();
    service.setConsent('u1', { analytics: true, marketing: true });

    await service.handleEvent('tip_initiated', { userId: 'u1' });

    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('persists events for anonymous payloads (no userId) without consent checks', async () => {
    const { service, repo } = buildService();
    // no userId in payload → no consent lookup, event always stored
    await service.handleEvent('discovery_page_view', { courseId: 'c99' });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// handleEvent — PII scrubbing
// ═════════════════════════════════════════════════════════════════════════════

describe('EventsService — PII scrubbing before storage', () => {
  const PII_FIELDS = [
    'email',
    'name',
    'fullName',
    'firstName',
    'lastName',
    'phone',
    'address',
    'dateOfBirth',
    'ssn',
    'password',
    'secret',
    'token',
    'privateKey',
  ];

  it.each(PII_FIELDS)('strips the PII field "%s" from the persisted payload', async (field) => {
    const { service, repo } = buildService();
    const payload = { courseId: 'c1', [field]: 'sensitive-value' };

    await service.handleEvent('auth_login', payload);

    const savedEntity = (repo.create as jest.Mock).mock.calls[0][0];
    const storedPayload = JSON.parse(savedEntity.payload);
    expect(storedPayload).not.toHaveProperty(field);
  });

  it('preserves non-PII fields in the stored payload', async () => {
    const { service, repo } = buildService();
    const payload = { courseId: 'c42', progressPct: 75, email: 'drop@me.com' };

    await service.handleEvent('course_progress_update', payload);

    const savedEntity = (repo.create as jest.Mock).mock.calls[0][0];
    const storedPayload = JSON.parse(savedEntity.payload);
    expect(storedPayload.courseId).toBe('c42');
    expect(storedPayload.progressPct).toBe(75);
    expect(storedPayload).not.toHaveProperty('email');
  });

  it('scrubs PII from nested objects', async () => {
    const { service, repo } = buildService();
    const payload = {
      courseId: 'c1',
      user: { id: 'u1', email: 'pii@test.com', score: 99 },
    };

    await service.handleEvent('auth_login', payload);

    const savedEntity = (repo.create as jest.Mock).mock.calls[0][0];
    const stored = JSON.parse(savedEntity.payload);
    expect(stored.user.id).toBe('u1');
    expect(stored.user.score).toBe(99);
    expect(stored.user).not.toHaveProperty('email');
  });

  it('stores userId and courseId as top-level index columns', async () => {
    const { service, repo } = buildService();

    await service.handleEvent('course_progress_update', {
      userId: 'user-123',
      courseId: 'course-456',
    });

    const entity = (repo.create as jest.Mock).mock.calls[0][0];
    expect(entity.userId).toBe('user-123');
    expect(entity.courseId).toBe('course-456');
  });

  it('sets userId and courseId to null when absent from payload', async () => {
    const { service, repo } = buildService();

    await service.handleEvent('discovery_page_view', { page: '/courses' });

    const entity = (repo.create as jest.Mock).mock.calls[0][0];
    expect(entity.userId).toBeNull();
    expect(entity.courseId).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// handleEvent — storage error resilience
// ═════════════════════════════════════════════════════════════════════════════

describe('EventsService — error resilience', () => {
  it('does not propagate repository errors to the caller', async () => {
    const { service, repo } = buildService();
    repo.save.mockRejectedValue(new Error('DB connection lost'));

    await expect(service.handleEvent('auth_login', { courseId: 'c1' })).resolves.not.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// findEvents — query filtering
// ═════════════════════════════════════════════════════════════════════════════

describe('EventsService.findEvents', () => {
  it('applies eventType filter', async () => {
    const qb = makeQb([[{ id: '1', eventType: 'auth_login' } as any], 1]);
    const { service, repo } = buildService();
    repo.createQueryBuilder.mockReturnValue(qb);

    const [events, total] = await service.findEvents({ eventType: 'auth_login' });

    expect(qb.andWhere).toHaveBeenCalledWith('event.eventType = :eventType', {
      eventType: 'auth_login',
    });
    expect(total).toBe(1);
    expect(events[0].eventType).toBe('auth_login');
  });

  it('applies userId filter', async () => {
    const qb = makeQb([[], 0]);
    const { service, repo } = buildService();
    repo.createQueryBuilder.mockReturnValue(qb);

    await service.findEvents({ userId: 'u42' });

    expect(qb.andWhere).toHaveBeenCalledWith('event.userId = :userId', { userId: 'u42' });
  });

  it('applies courseId filter', async () => {
    const qb = makeQb([[], 0]);
    const { service, repo } = buildService();
    repo.createQueryBuilder.mockReturnValue(qb);

    await service.findEvents({ courseId: 'c99' });

    expect(qb.andWhere).toHaveBeenCalledWith('event.courseId = :courseId', { courseId: 'c99' });
  });

  it('applies startDate filter', async () => {
    const qb = makeQb([[], 0]);
    const { service, repo } = buildService();
    repo.createQueryBuilder.mockReturnValue(qb);
    const startDate = new Date('2024-01-01');

    await service.findEvents({ startDate });

    expect(qb.andWhere).toHaveBeenCalledWith('event.timestamp >= :startDate', { startDate });
  });

  it('applies endDate filter', async () => {
    const qb = makeQb([[], 0]);
    const { service, repo } = buildService();
    repo.createQueryBuilder.mockReturnValue(qb);
    const endDate = new Date('2024-12-31');

    await service.findEvents({ endDate });

    expect(qb.andWhere).toHaveBeenCalledWith('event.timestamp <= :endDate', { endDate });
  });

  it('applies limit and offset for pagination', async () => {
    const qb = makeQb([[], 0]);
    const { service, repo } = buildService();
    repo.createQueryBuilder.mockReturnValue(qb);

    await service.findEvents({ limit: 10, offset: 20 });

    expect(qb.take).toHaveBeenCalledWith(10);
    expect(qb.skip).toHaveBeenCalledWith(20);
  });

  it('skips limit/offset when not provided', async () => {
    const qb = makeQb([[], 0]);
    const { service, repo } = buildService();
    repo.createQueryBuilder.mockReturnValue(qb);

    await service.findEvents({});

    expect(qb.take).not.toHaveBeenCalled();
    expect(qb.skip).not.toHaveBeenCalled();
  });

  it('returns empty array and total=0 when no events match', async () => {
    const qb = makeQb([[], 0]);
    const { service, repo } = buildService();
    repo.createQueryBuilder.mockReturnValue(qb);

    const [events, total] = await service.findEvents({ eventType: 'nonexistent' });

    expect(events).toHaveLength(0);
    expect(total).toBe(0);
  });

  it('returns all events when called with no filters', async () => {
    const mockEvents: Partial<AnalyticsEvent>[] = [
      { id: '1', eventType: 'auth_login' },
      { id: '2', eventType: 'auth_register' },
    ];
    const qb = makeQb([mockEvents as AnalyticsEvent[], 2]);
    const { service, repo } = buildService();
    repo.createQueryBuilder.mockReturnValue(qb);

    const [events, total] = await service.findEvents();

    expect(total).toBe(2);
    expect(events).toHaveLength(2);
  });
});
