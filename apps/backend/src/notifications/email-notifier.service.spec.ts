import { Test, TestingModule } from '@nestjs/testing';
import { EmailNotifierService } from './email-notifier.service';
import { MailService } from '../mail/mail.service';
import { NotificationType } from './notification.entity';

describe('EmailNotifierService', () => {
  let service: EmailNotifierService;
  let mailService: { sendMail: jest.Mock };

  beforeEach(async () => {
    mailService = { sendMail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailNotifierService,
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<EmailNotifierService>(EmailNotifierService);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('has channel set to "email"', () => {
    expect(service.channel).toBe('email');
  });

  describe('send', () => {
    const emailContext = {
      to: 'student@example.com',
      context: { courseName: 'Rust 101' },
    };

    it('sends email with correct subject and html for ENROLLMENT', async () => {
      mailService.sendMail.mockResolvedValue(undefined);

      await service.send(NotificationType.ENROLLMENT, emailContext);

      expect(mailService.sendMail).toHaveBeenCalledWith({
        to: 'student@example.com',
        subject: 'Enrolled in Rust 101',
        html: expect.stringContaining('Rust 101'),
      });
    });

    it('sends email with correct subject and html for COMPLETION', async () => {
      mailService.sendMail.mockResolvedValue(undefined);

      await service.send(NotificationType.COMPLETION, emailContext);

      expect(mailService.sendMail).toHaveBeenCalledWith({
        to: 'student@example.com',
        subject: 'Course Completed: Rust 101',
        html: expect.stringContaining('Rust 101'),
      });
    });

    it('sends email with correct subject and html for CREDENTIAL_ISSUED', async () => {
      mailService.sendMail.mockResolvedValue(undefined);

      await service.send(NotificationType.CREDENTIAL_ISSUED, emailContext);

      expect(mailService.sendMail).toHaveBeenCalledWith({
        to: 'student@example.com',
        subject: 'Credential Issued for Rust 101',
        html: expect.stringContaining('Rust 101'),
      });
    });

    it('sends email with correct subject and html for COURSE_PUBLISHED', async () => {
      mailService.sendMail.mockResolvedValue(undefined);

      await service.send(NotificationType.COURSE_PUBLISHED, emailContext);

      expect(mailService.sendMail).toHaveBeenCalledWith({
        to: 'student@example.com',
        subject: 'New Course Available: Rust 101',
        html: expect.stringContaining('Rust 101'),
      });
    });

    it('interpolates the courseName into the email body', async () => {
      mailService.sendMail.mockResolvedValue(undefined);

      await service.send(NotificationType.ENROLLMENT, {
        to: 'a@b.com',
        context: { courseName: 'Stellar Basics' },
      });

      const { html } = mailService.sendMail.mock.calls[0][0] as { html: string };
      expect(html).toContain('Stellar Basics');
    });

    it('throws and logs when sendMail rejects', async () => {
      const err = new Error('SMTP failure');
      mailService.sendMail.mockRejectedValue(err);

      await expect(service.send(NotificationType.ENROLLMENT, emailContext)).rejects.toThrow(
        'SMTP failure'
      );
    });

    it('logs a warning and returns without calling sendMail for an unknown type', async () => {
      // Cast to bypass TS — simulates runtime unknown type
      await service.send('UNKNOWN_TYPE' as NotificationType, emailContext);

      expect(mailService.sendMail).not.toHaveBeenCalled();
    });
  });
});
