import { Injectable, NotFoundException, Inject, forwardRef, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';
import { ScheduledNotification, ScheduledNotificationStatus } from './scheduled-notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { MailService } from '../mail/mail.service';

// Notification templates
const TEMPLATES: Record<NotificationType, (ctx: Record<string, string>) => { subject: string; html: string }> = {
  [NotificationType.ENROLLMENT]: (ctx) => ({
    subject: `Enrolled in ${ctx.courseName}`,
    html: `<p>You have been enrolled in <strong>${ctx.courseName}</strong>. Start learning now!</p>`,
  }),
  [NotificationType.COMPLETION]: (ctx) => ({
    subject: `Course Completed: ${ctx.courseName}`,
    html: `<p>Congratulations! You have completed <strong>${ctx.courseName}</strong>.</p>`,
  }),
  [NotificationType.CREDENTIAL_ISSUED]: (ctx) => ({
    subject: `Credential Issued for ${ctx.courseName}`,
    html: `<p>Your credential for <strong>${ctx.courseName}</strong> has been issued on the Stellar blockchain!</p>`,
  }),
  [NotificationType.COURSE_PUBLISHED]: (ctx) => ({
    subject: `New Course Available: ${ctx.courseName}`,
    html: `<p>A new course <strong>${ctx.courseName}</strong> is now available.</p>`,
  }),
};

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
    @InjectRepository(NotificationPreference) private prefRepo: Repository<NotificationPreference>,
    @InjectRepository(ScheduledNotification) private scheduledRepo: Repository<ScheduledNotification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private gateway: NotificationsGateway,
    private mailService: MailService,
  ) {}

  onModuleInit() {
    // Process scheduled notifications every minute
    setInterval(() => this.processScheduled(), 60_000);
  }

  async create(userId: string, type: NotificationType, message: string, emailContext?: { to: string; context: Record<string, string> }) {
    const prefs = await this.getOrCreatePrefs(userId);

    // In-app notification
    if (prefs.inApp) {
      const notification = this.repo.create({ userId, type, message });
      const saved = await this.repo.save(notification);
      this.gateway.emitToUser(userId, 'notification', saved);
    }

    // Email notification
    if (prefs.email && emailContext && this.isTypeEnabled(prefs, type)) {
      const tpl = TEMPLATES[type]?.(emailContext.context);
      if (tpl) {
        await this.mailService.sendMail({ to: emailContext.to, subject: tpl.subject, html: tpl.html })
          .catch((err) => this.logger.error(`Email notification failed: ${err.message}`));
      }
    }

    // Push notification (WebSocket broadcast — real push would require FCM/APNs integration)
    if (prefs.push) {
      this.gateway.emitToUser(userId, 'push', { type, message });
    }

    return this.repo.findOne({ where: { userId, type, message }, order: { createdAt: 'DESC' } });
  }

  async findByUser(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { isRead: 'ASC', createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string) {
    const notification = await this.repo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.isRead = true;
    return this.repo.save(notification);
  }

  async markAllAsRead(userId: string) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }

  // ── Preferences ──────────────────────────────────────────────────────────

  async getPreferences(userId: string): Promise<NotificationPreference> {
    return this.getOrCreatePrefs(userId);
  }

  async updatePreferences(userId: string, updates: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const prefs = await this.getOrCreatePrefs(userId);
    Object.assign(prefs, updates);
    return this.prefRepo.save(prefs);
  }

  // ── Scheduling ───────────────────────────────────────────────────────────

  async schedule(userId: string, type: NotificationType, message: string, scheduledAt: Date): Promise<ScheduledNotification> {
    return this.scheduledRepo.save(this.scheduledRepo.create({ userId, type, message, scheduledAt }));
  }

  async cancelScheduled(id: string): Promise<ScheduledNotification> {
    const scheduled = await this.scheduledRepo.findOne({ where: { id } });
    if (!scheduled) throw new NotFoundException('Scheduled notification not found');
    scheduled.status = ScheduledNotificationStatus.CANCELLED;
    return this.scheduledRepo.save(scheduled);
  }

  async processScheduled(): Promise<void> {
    const due = await this.scheduledRepo.find({
      where: { status: ScheduledNotificationStatus.PENDING, scheduledAt: LessThanOrEqual(new Date()) },
    });
    for (const item of due) {
      try {
        await this.create(item.userId, item.type, item.message);
        item.status = ScheduledNotificationStatus.SENT;
      } catch (err) {
        this.logger.error(`Failed to send scheduled notification ${item.id}: ${err.message}`);
      }
      await this.scheduledRepo.save(item);
    }
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  async onEnrollmentCreated(userId: string, courseName: string, userEmail?: string) {
    return this.create(userId, NotificationType.ENROLLMENT, `You have been enrolled in ${courseName}`,
      userEmail ? { to: userEmail, context: { courseName } } : undefined);
  }

  async onCredentialIssued(userId: string, courseName: string, userEmail?: string) {
    return this.create(userId, NotificationType.CREDENTIAL_ISSUED, `Your credential for ${courseName} has been issued!`,
      userEmail ? { to: userEmail, context: { courseName } } : undefined);
  }

  async onProgressCompleted(userId: string, courseName: string, userEmail?: string) {
    return this.create(userId, NotificationType.COMPLETION, `Congratulations! You have completed ${courseName}`,
      userEmail ? { to: userEmail, context: { courseName } } : undefined);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async getOrCreatePrefs(userId: string): Promise<NotificationPreference> {
    let prefs = await this.prefRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.prefRepo.create({ userId });
      prefs = await this.prefRepo.save(prefs);
    }
    return prefs;
  }

  private isTypeEnabled(prefs: NotificationPreference, type: NotificationType): boolean {
    const map: Partial<Record<NotificationType, keyof NotificationPreference>> = {
      [NotificationType.ENROLLMENT]: 'enrollment',
      [NotificationType.COMPLETION]: 'completion',
      [NotificationType.CREDENTIAL_ISSUED]: 'credentialIssued',
      [NotificationType.COURSE_PUBLISHED]: 'coursePublished',
    };
    const key = map[type];
    return key ? (prefs[key] as boolean) : true;
  }
}
