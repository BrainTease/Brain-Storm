import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, In } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { Webhook } from './webhook.entity';
import { WebhookDelivery, DeliveryStatus } from './webhook-delivery.entity';

const MAX_ATTEMPTS = 5;
/** Exponential backoff delays in seconds: ~30s, 5m, 30m, 2h, 8h */
const RETRY_DELAYS = [30, 300, 1800, 7200, 28800];
/** Seconds to keep the previous secret valid during rotation (24 h) */
const SECRET_GRACE_SECONDS = 86_400;

@Injectable()
export class WebhooksService implements OnModuleInit {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook) private webhookRepo: Repository<Webhook>,
    @InjectRepository(WebhookDelivery) private deliveryRepo: Repository<WebhookDelivery>,
  ) {}

  onModuleInit() {
    // Poll every 60 s for pending retries
    setInterval(() => this.retryPending(), 60_000);
    // Clean up expired previous secrets every hour
    setInterval(() => this.purgeExpiredSecrets(), 3_600_000);
  }

  // ─── Registration ───────────────────────────────────────────────────────────

  async register(userId: string, url: string, events: string[]): Promise<Webhook> {
    const secret = this.generateSecret();
    return this.webhookRepo.save(
      this.webhookRepo.create({ userId, url, events: events.join(','), secret }),
    );
  }

  async list(userId: string): Promise<Webhook[]> {
    return this.webhookRepo.find({ where: { userId } });
  }

  async getWebhookForUser(id: string, userId: string): Promise<Webhook> {
    const wh = await this.webhookRepo.findOne({ where: { id, userId } });
    if (!wh) throw new NotFoundException('Webhook not found');
    return wh;
  }

  async delete(userId: string, id: string): Promise<void> {
    const wh = await this.webhookRepo.findOne({ where: { id, userId } });
    if (!wh) throw new NotFoundException('Webhook not found');
    await this.webhookRepo.remove(wh);
  }

  async update(
    userId: string,
    id: string,
    data: Partial<Pick<Webhook, 'url' | 'events' | 'isActive'>>,
  ): Promise<Webhook> {
    const wh = await this.webhookRepo.findOne({ where: { id, userId } });
    if (!wh) throw new NotFoundException('Webhook not found');
    if (data.url) wh.url = data.url;
    if (data.events)
      wh.events = Array.isArray(data.events) ? (data.events as any).join(',') : data.events;
    if (data.isActive !== undefined) wh.isActive = data.isActive;
    return this.webhookRepo.save(wh);
  }

  /**
   * Rotate the HMAC signing secret.
   * The old secret is preserved for SECRET_GRACE_SECONDS so consumers can drain
   * in-flight deliveries before the rotation is complete.
   */
  async rotateSecret(userId: string, id: string): Promise<{ secret: string; previousSecretExpiresAt: Date }> {
    const wh = await this.webhookRepo.findOne({ where: { id, userId } });
    if (!wh) throw new NotFoundException('Webhook not found');

    wh.previousSecret = wh.secret;
    wh.secretRotatedAt = new Date(Date.now() + SECRET_GRACE_SECONDS * 1000);
    wh.secret = this.generateSecret();
    await this.webhookRepo.save(wh);

    return { secret: wh.secret, previousSecretExpiresAt: wh.secretRotatedAt };
  }

  // ─── Event publishing ───────────────────────────────────────────────────────

  async publish(event: string, payload: object): Promise<void> {
    const webhooks = await this.webhookRepo
      .createQueryBuilder('w')
      .where('w.isActive = true')
      .andWhere(`w.events LIKE :event`, { event: `%${event}%` })
      .getMany();

    for (const wh of webhooks) {
      const delivery = this.deliveryRepo.create({
        webhookId: wh.id,
        event,
        payload: JSON.stringify(payload),
      });
      const saved = await this.deliveryRepo.save(delivery);
      setImmediate(() => this.deliver(wh, saved));
    }
  }

  // ─── Signature ──────────────────────────────────────────────────────────────

  /**
   * Verify a signature against the active secret AND the previous secret
   * (if still within the grace window).
   */
  verifySignature(
    secret: string,
    body: string,
    signature: string,
    timestamp?: string,
    previousSecret?: string | null,
    secretRotatedAt?: Date | null,
  ): boolean {
    if (timestamp) {
      const ts = parseInt(timestamp, 10);
      if (isNaN(ts)) return false;
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > 300) return false; // 5-minute replay window
    }

    const expected = this.sign(secret, body);
    if (this.safeCompare(signature, expected)) return true;

    // Also accept the previous secret during the grace period
    if (previousSecret && secretRotatedAt && new Date() < secretRotatedAt) {
      const expectedOld = this.sign(previousSecret, body);
      return this.safeCompare(signature, expectedOld);
    }

    return false;
  }

  // ─── Delivery log & replay ──────────────────────────────────────────────────

  getLogs(webhookId: string, userId: string) {
    return this.deliveryRepo
      .createQueryBuilder('d')
      .innerJoin(Webhook, 'w', 'w.id = d.webhookId')
      .where('d.webhookId = :webhookId', { webhookId })
      .andWhere('w.userId = :userId', { userId })
      .orderBy('d.createdAt', 'DESC')
      .limit(100)
      .getMany();
  }

  /** Return all DLQ entries for a webhook */
  async getDlq(webhookId: string, userId: string): Promise<WebhookDelivery[]> {
    const wh = await this.webhookRepo.findOne({ where: { id: webhookId, userId } });
    if (!wh) throw new NotFoundException('Webhook not found');
    return this.deliveryRepo.find({
      where: { webhookId, status: DeliveryStatus.DLQ },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Re-enqueue a single DLQ delivery for immediate retry */
  async replayDelivery(deliveryId: string, userId: string): Promise<WebhookDelivery> {
    const delivery = await this.deliveryRepo
      .createQueryBuilder('d')
      .innerJoin(Webhook, 'w', 'w.id = d.webhookId')
      .where('d.id = :deliveryId', { deliveryId })
      .andWhere('w.userId = :userId', { userId })
      .select('d')
      .getOne();
    if (!delivery) throw new NotFoundException('Delivery not found');

    // Reset for retry
    delivery.status = DeliveryStatus.PENDING;
    delivery.attempts = 0;
    delivery.nextRetryAt = null;
    delivery.deadLetteredAt = null;
    const saved = await this.deliveryRepo.save(delivery);

    const wh = await this.webhookRepo.findOne({ where: { id: saved.webhookId } });
    if (wh) setImmediate(() => this.deliver(wh, saved));
    return saved;
  }

  // ─── Internal delivery ──────────────────────────────────────────────────────

  private async deliver(wh: Webhook, delivery: WebhookDelivery): Promise<void> {
    delivery.attempts += 1;
    const body = delivery.payload;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sig = this.sign(wh.secret, body);

    try {
      const { status, responseBody } = await this.httpPost(wh.url, body, sig, timestamp);
      delivery.responseStatus = status;
      delivery.responseBody = responseBody.slice(0, 500);
      delivery.status = status >= 200 && status < 300 ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED;
    } catch (err: any) {
      delivery.responseBody = err.message?.slice(0, 500) ?? 'Unknown error';
      delivery.status = DeliveryStatus.FAILED;
    }

    if (delivery.status === DeliveryStatus.FAILED) {
      if (delivery.attempts < MAX_ATTEMPTS) {
        const delaySec = RETRY_DELAYS[delivery.attempts - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
        delivery.nextRetryAt = new Date(Date.now() + delaySec * 1000);
        delivery.status = DeliveryStatus.PENDING;
        this.logger.warn(
          `Delivery ${delivery.id} failed (attempt ${delivery.attempts}/${MAX_ATTEMPTS}), retry in ${delaySec}s`,
        );
      } else {
        // Move to dead-letter queue
        delivery.status = DeliveryStatus.DLQ;
        delivery.deadLetteredAt = new Date();
        this.logger.error(
          `Delivery ${delivery.id} exhausted ${MAX_ATTEMPTS} attempts → DLQ`,
        );
      }
    }

    await this.deliveryRepo.save(delivery);
  }

  async retryPending(): Promise<void> {
    const now = new Date();
    const pending = await this.deliveryRepo.find({
      where: [
        { status: DeliveryStatus.PENDING, nextRetryAt: LessThanOrEqual(now) },
        { status: DeliveryStatus.PENDING, nextRetryAt: IsNull() },
      ],
      take: 20,
    });

    for (const delivery of pending) {
      const wh = await this.webhookRepo.findOne({ where: { id: delivery.webhookId } });
      if (wh) await this.deliver(wh, delivery);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private generateSecret(): string {
    return 'whs_' + crypto.randomBytes(32).toString('hex');
  }

  private sign(secret: string, body: string): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  private safeCompare(a: string, b: string): boolean {
    try {
      return (
        a.length === b.length &&
        crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
      );
    } catch {
      return false;
    }
  }

  private async purgeExpiredSecrets(): Promise<void> {
    const now = new Date();
    await this.webhookRepo
      .createQueryBuilder()
      .update(Webhook)
      .set({ previousSecret: null, secretRotatedAt: null })
      .where('secretRotatedAt IS NOT NULL AND secretRotatedAt <= :now', { now })
      .execute();
  }

  private httpPost(
    url: string,
    body: string,
    signature: string,
    timestamp: string,
  ): Promise<{ status: number; responseBody: string }> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp,
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, responseBody: data }));
        },
      );
      req.on('error', reject);
      req.setTimeout(10_000, () => {
        req.destroy();
        reject(new Error('Webhook delivery timeout'));
      });
      req.write(body);
      req.end();
    });
  }

  // ─── Event listeners ─────────────────────────────────────────────────────────

  @OnEvent('enrollment.created')
  onEnrollment(payload: any) {
    this.publish('enrollment.created', payload);
  }

  @OnEvent('enrollment.completed')
  onCompletion(payload: any) {
    this.publish('enrollment.completed', payload);
  }

  @OnEvent('credential.issued')
  onCredential(payload: any) {
    this.publish('credential.issued', payload);
  }

  @OnEvent('payment.completed')
  onPaymentCompleted(payload: any) {
    this.publish('payment.completed', payload);
  }
}
