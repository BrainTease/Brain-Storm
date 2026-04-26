import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, Or } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { EmailQueue, EmailStatus } from './email-queue.entity';
import { EmailPreference } from './email-preference.entity';
import { emailTemplates } from './email.templates';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [60, 300, 900]; // seconds

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private processing = false;

  constructor(
    @InjectRepository(EmailQueue) private queueRepo: Repository<EmailQueue>,
    @InjectRepository(EmailPreference) private prefRepo: Repository<EmailPreference>,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('mail.host'),
      port: this.config.get<number>('mail.port'),
      secure: this.config.get<boolean>('mail.secure'),
      auth: { user: this.config.get<string>('mail.user'), pass: this.config.get<string>('mail.pass') },
    });
    // Process queue every 30 seconds
    setInterval(() => this.processQueue(), 30_000);
  }

  private async getOrCreatePrefs(userId: string): Promise<EmailPreference> {
    let prefs = await this.prefRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.prefRepo.create({ userId, unsubscribeToken: crypto.randomUUID() });
      prefs = await this.prefRepo.save(prefs);
    }
    return prefs;
  }

  private unsubscribeUrl(token: string) {
    return `${this.config.get('frontend.url')}/email/unsubscribe?token=${token}`;
  }

  async enqueue(to: string, subject: string, html: string): Promise<void> {
    await this.queueRepo.save(this.queueRepo.create({ to, subject, html }));
    // Try to send immediately
    setImmediate(() => this.processQueue());
  }

  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      const now = new Date();
      const jobs = await this.queueRepo.find({
        where: [
          { status: EmailStatus.PENDING, nextRetryAt: IsNull() },
          { status: EmailStatus.PENDING, nextRetryAt: LessThanOrEqual(now) },
        ],
        take: 10,
        order: { createdAt: 'ASC' },
      });

      for (const job of jobs) {
        await this.sendJob(job);
      }
    } finally {
      this.processing = false;
    }
  }

  private async sendJob(job: EmailQueue): Promise<void> {
    job.attempts += 1;
    try {
      if (!this.config.get<boolean>('mail.enabled')) {
        this.logger.log(`[DEV] Email to ${job.to}: ${job.subject}`);
      } else {
        await this.transporter.sendMail({
          from: this.config.get<string>('mail.from'),
          to: job.to,
          subject: job.subject,
          html: job.html,
        });
      }
      job.status = EmailStatus.SENT;
    } catch (err: any) {
      job.lastError = err.message;
      if (job.attempts >= MAX_ATTEMPTS) {
        job.status = EmailStatus.FAILED;
      } else {
        const delaySec = RETRY_DELAYS[job.attempts - 1] ?? 900;
        job.nextRetryAt = new Date(Date.now() + delaySec * 1000);
      }
    }
    await this.queueRepo.save(job);
  }

  // --- Event listeners ---

  @OnEvent('enrollment.created')
  async onEnrollment(payload: { userId: string; courseId: string; userEmail: string; userName: string; courseTitle: string }) {
    const prefs = await this.getOrCreatePrefs(payload.userId);
    if (prefs.unsubscribedAll || !prefs.enrollment) return;

    const tpl = emailTemplates.enrollment({
      userName: payload.userName,
      courseTitle: payload.courseTitle,
      courseUrl: `${this.config.get('frontend.url')}/courses/${payload.courseId}`,
      unsubscribeUrl: this.unsubscribeUrl(prefs.unsubscribeToken),
    });
    await this.enqueue(payload.userEmail, tpl.subject, tpl.html);
  }

  @OnEvent('enrollment.completed')
  async onCompletion(payload: { userId: string; courseId: string; userEmail: string; userName: string; courseTitle: string }) {
    const prefs = await this.getOrCreatePrefs(payload.userId);
    if (prefs.unsubscribedAll || !prefs.completion) return;

    const tpl = emailTemplates.completion({
      userName: payload.userName,
      courseTitle: payload.courseTitle,
      credentialUrl: `${this.config.get('frontend.url')}/credentials`,
      unsubscribeUrl: this.unsubscribeUrl(prefs.unsubscribeToken),
    });
    await this.enqueue(payload.userEmail, tpl.subject, tpl.html);
  }

  @OnEvent('credential.issued')
  async onCredentialIssued(payload: { userId: string; userEmail: string; userName: string; courseTitle: string; txHash: string }) {
    const prefs = await this.getOrCreatePrefs(payload.userId);
    if (prefs.unsubscribedAll || !prefs.credentialIssued) return;

    const tpl = emailTemplates.credentialIssued({
      userName: payload.userName,
      courseTitle: payload.courseTitle,
      txHash: payload.txHash,
      unsubscribeUrl: this.unsubscribeUrl(prefs.unsubscribeToken),
    });
    await this.enqueue(payload.userEmail, tpl.subject, tpl.html);
  }

  // --- Preferences management ---

  async getPreferences(userId: string) {
    return this.getOrCreatePrefs(userId);
  }

  async updatePreferences(userId: string, updates: Partial<Pick<EmailPreference, 'enrollment' | 'completion' | 'credentialIssued' | 'marketing'>>) {
    const prefs = await this.getOrCreatePrefs(userId);
    Object.assign(prefs, updates);
    return this.prefRepo.save(prefs);
  }

  async unsubscribeByToken(token: string): Promise<void> {
    const prefs = await this.prefRepo.findOne({ where: { unsubscribeToken: token } });
    if (!prefs) return;
    prefs.unsubscribedAll = true;
    await this.prefRepo.save(prefs);
  }
}
