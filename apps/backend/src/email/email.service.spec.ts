import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailQueue, EmailStatus } from './email-queue.entity';
import { EmailPreference } from './email-preference.entity';

// Prevent real nodemailer transport
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
}));

describe('EmailService', () => {
  let service: EmailService;
  let mockTransporter: { sendMail: jest.Mock };

  const mockQueueRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  const mockPrefRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const mockConfig = {
    get: jest.fn((key: string) => {
      const cfg: Record<string, unknown> = {
        'mail.host': 'smtp.example.com',
        'mail.port': 587,
        'mail.secure': false,
        'mail.user': 'user',
        'mail.pass': 'pass',
        'mail.from': 'no-reply@example.com',
        'mail.enabled': false, // dev mode — no real sends
        'frontend.url': 'https://app.example.com',
      };
      return cfg[key];
    }),
  };

  beforeEach(async () => {
    const nodemailer = require('nodemailer');
    mockTransporter = { sendMail: jest.fn() };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: getRepositoryToken(EmailQueue), useValue: mockQueueRepo },
        { provide: getRepositoryToken(EmailPreference), useValue: mockPrefRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ── enqueue ──────────────────────────────────────────────────────────────────

  describe('enqueue', () => {
    it('saves a new job to the queue and triggers processing', async () => {
      const job = { id: 'j1', to: 'a@b.com', status: EmailStatus.PENDING, attempts: 0 } as EmailQueue;
      mockQueueRepo.create.mockReturnValue(job);
      mockQueueRepo.save.mockResolvedValue(job);
      mockQueueRepo.find.mockResolvedValue([]);

      await service.enqueue('a@b.com', 'Subject', '<p>Body</p>');

      expect(mockQueueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'a@b.com', subject: 'Subject', html: '<p>Body</p>' }),
      );
      expect(mockQueueRepo.save).toHaveBeenCalled();
    });
  });

  // ── processQueue ─────────────────────────────────────────────────────────────

  describe('processQueue', () => {
    it('marks job as SENT in dev mode (mail.enabled = false)', async () => {
      const job = {
        id: 'j1', to: 'a@b.com', subject: 'Hi', html: '<p>Test</p>',
        status: EmailStatus.PENDING, attempts: 0, nextRetryAt: null,
      } as EmailQueue;
      mockQueueRepo.find.mockResolvedValue([job]);
      mockQueueRepo.save.mockImplementation((j: any) => Promise.resolve(j));

      await service.processQueue();

      expect(job.status).toBe(EmailStatus.SENT);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('schedules retry and preserves PENDING on send failure', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'mail.enabled') return true;
        if (key === 'mail.from') return 'no-reply@example.com';
        return null;
      });
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const job = {
        id: 'j1', to: 'a@b.com', subject: 'Hi', html: '<p>Test</p>',
        status: EmailStatus.PENDING, attempts: 0, nextRetryAt: null,
      } as EmailQueue;
      mockQueueRepo.find.mockResolvedValue([job]);
      mockQueueRepo.save.mockImplementation((j: any) => Promise.resolve(j));

      await service.processQueue();

      expect(job.status).toBe(EmailStatus.PENDING);
      expect(job.attempts).toBe(1);
      expect(job.nextRetryAt).toBeInstanceOf(Date);
      expect(job.lastError).toBe('SMTP error');
    });

    it('marks job as FAILED after max attempts exhausted', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'mail.enabled') return true;
        if (key === 'mail.from') return 'no-reply@example.com';
        return null;
      });
      mockTransporter.sendMail.mockRejectedValue(new Error('Final failure'));

      const job = {
        id: 'j1', to: 'a@b.com', subject: 'Hi', html: '<p>Test</p>',
        status: EmailStatus.PENDING, attempts: 2, nextRetryAt: null, // attempt 3 = MAX
      } as EmailQueue;
      mockQueueRepo.find.mockResolvedValue([job]);
      mockQueueRepo.save.mockImplementation((j: any) => Promise.resolve(j));

      await service.processQueue();

      expect(job.status).toBe(EmailStatus.FAILED);
    });

    it('does not process if already processing (guards concurrent runs)', async () => {
      (service as any).processing = true;
      await service.processQueue();
      expect(mockQueueRepo.find).not.toHaveBeenCalled();
      (service as any).processing = false;
    });
  });

  // ── event handlers ────────────────────────────────────────────────────────────

  describe('onEnrollment', () => {
    it('enqueues email when enrollment preference is enabled', async () => {
      const prefs = { userId: 'u1', unsubscribedAll: false, enrollment: true, unsubscribeToken: 'tok' } as EmailPreference;
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      const job = { id: 'j1' } as EmailQueue;
      mockQueueRepo.create.mockReturnValue(job);
      mockQueueRepo.save.mockResolvedValue(job);
      mockQueueRepo.find.mockResolvedValue([]);

      await service.onEnrollment({
        userId: 'u1', courseId: 'c1', userEmail: 'a@b.com',
        userName: 'Alice', courseTitle: 'Rust 101',
      });

      expect(mockQueueRepo.save).toHaveBeenCalled();
    });

    it('skips email when user has unsubscribed from all', async () => {
      const prefs = { userId: 'u1', unsubscribedAll: true, enrollment: true, unsubscribeToken: 'tok' } as EmailPreference;
      mockPrefRepo.findOne.mockResolvedValue(prefs);

      await service.onEnrollment({
        userId: 'u1', courseId: 'c1', userEmail: 'a@b.com',
        userName: 'Alice', courseTitle: 'Rust 101',
      });

      expect(mockQueueRepo.save).not.toHaveBeenCalled();
    });

    it('skips email when enrollment preference is disabled', async () => {
      const prefs = { userId: 'u1', unsubscribedAll: false, enrollment: false, unsubscribeToken: 'tok' } as EmailPreference;
      mockPrefRepo.findOne.mockResolvedValue(prefs);

      await service.onEnrollment({
        userId: 'u1', courseId: 'c1', userEmail: 'a@b.com',
        userName: 'Alice', courseTitle: 'Rust 101',
      });

      expect(mockQueueRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── unsubscribeByToken ────────────────────────────────────────────────────────

  describe('unsubscribeByToken', () => {
    it('sets unsubscribedAll to true for matching token', async () => {
      const prefs = { userId: 'u1', unsubscribedAll: false, unsubscribeToken: 'tok123' } as EmailPreference;
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      mockPrefRepo.save.mockImplementation((p: any) => Promise.resolve(p));

      await service.unsubscribeByToken('tok123');

      expect(prefs.unsubscribedAll).toBe(true);
      expect(mockPrefRepo.save).toHaveBeenCalled();
    });

    it('returns silently when token not found (no throw)', async () => {
      mockPrefRepo.findOne.mockResolvedValue(null);

      await expect(service.unsubscribeByToken('unknown')).resolves.toBeUndefined();
      expect(mockPrefRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── updatePreferences ─────────────────────────────────────────────────────────

  describe('updatePreferences', () => {
    it('merges updates into existing preferences', async () => {
      const prefs = { userId: 'u1', enrollment: true, completion: true, unsubscribeToken: 'tok' } as EmailPreference;
      mockPrefRepo.findOne.mockResolvedValue(prefs);
      mockPrefRepo.save.mockImplementation((p: any) => Promise.resolve(p));

      await service.updatePreferences('u1', { enrollment: false });

      expect(prefs.enrollment).toBe(false);
      expect(mockPrefRepo.save).toHaveBeenCalled();
    });
  });
});
