import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from './notification.entity';
import { MailService } from '../mail/mail.service';

export interface EmailNotificationContext {
  to: string;
  context: Record<string, string>;
}

const EMAIL_TEMPLATES: Record<
  NotificationType,
  (ctx: Record<string, string>) => { subject: string; html: string }
> = {
  ENROLLMENT: (ctx) => ({
    subject: `Enrolled in ${ctx.courseName}`,
    html: `<p>You have been enrolled in <strong>${ctx.courseName}</strong>. Start learning now!</p>`,
  }),
  COMPLETION: (ctx) => ({
    subject: `Course Completed: ${ctx.courseName}`,
    html: `<p>Congratulations! You have completed <strong>${ctx.courseName}</strong>.</p>`,
  }),
  CREDENTIAL_ISSUED: (ctx) => ({
    subject: `Credential Issued for ${ctx.courseName}`,
    html: `<p>Your credential for <strong>${ctx.courseName}</strong> has been issued on the Stellar blockchain!</p>`,
  }),
  COURSE_PUBLISHED: (ctx) => ({
    subject: `New Course Available: ${ctx.courseName}`,
    html: `<p>A new course <strong>${ctx.courseName}</strong> is now available.</p>`,
  }),
};

@Injectable()
export class EmailNotifierService {
  private readonly logger = new Logger(EmailNotifierService.name);

  constructor(private readonly mailService: MailService) {}

  async send(type: NotificationType, emailContext: EmailNotificationContext): Promise<void> {
    const tpl = EMAIL_TEMPLATES[type];
    if (!tpl) {
      this.logger.warn(`No email template found for notification type: ${type}`);
      return;
    }

    const { subject, html } = tpl(emailContext.context);
    try {
      await this.mailService.sendMail({
        to: emailContext.to,
        subject,
        html,
      });
    } catch (err: any) {
      this.logger.error(`Email notification failed: ${err.message}`);
      throw err;
    }
  }
}
