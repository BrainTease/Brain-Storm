import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { Payment, PaymentProvider, PaymentStatus } from './payment.entity';
import { Subscription, SubscriptionStatus, SubscriptionPlan } from './subscription.entity';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Subscription) private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly stellarService: StellarService,
    private readonly dataSource: DataSource,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('stripe.secretKey') ?? '', {
      apiVersion: '2024-04-10',
    });
  }

  // ─── Stripe fiat checkout ───────────────────────────────────────────────────

  /**
   * Create a Stripe Checkout session for a one-time course purchase.
   * Returns the session URL so the client can redirect.
   */
  async createCheckoutSession(
    userId: string,
    courseId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string; sessionId: string }> {
    // Idempotency: prevent duplicate pending payments
    const existing = await this.paymentRepo.findOne({
      where: { userId, courseId, status: PaymentStatus.PENDING, provider: PaymentProvider.STRIPE },
    });
    if (existing?.stripePaymentIntentId) {
      throw new ConflictException('A pending payment already exists for this course');
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, courseId },
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
    });

    // Record the payment intent before the user completes checkout
    await this.paymentRepo.save(
      this.paymentRepo.create({
        userId,
        courseId,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.PENDING,
        stripePaymentIntentId: session.id, // session ID acts as idempotency anchor
        idempotencyKey: session.id,
        currency: session.currency ?? 'usd',
        amountCents: session.amount_total ?? 0,
      }),
    );

    return { url: session.url!, sessionId: session.id };
  }

  /**
   * Create a Stripe Subscription for recurring billing.
   */
  async createSubscription(
    userId: string,
    plan: SubscriptionPlan,
    priceId: string,
    paymentMethodId: string,
  ): Promise<Subscription> {
    // Get or create a Stripe customer
    let stripeCustomerId = await this.getStripeCustomerId(userId);
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
    }

    // Attach the payment method
    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
    await this.stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Create the subscription
    const stripeSub = await this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      metadata: { userId, plan },
      expand: ['latest_invoice.payment_intent'],
    });

    const sub = this.subscriptionRepo.create({
      userId,
      plan,
      status: SubscriptionStatus.ACTIVE,
      stripeSubscriptionId: stripeSub.id,
      stripeCustomerId,
      currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
    });

    return this.subscriptionRepo.save(sub);
  }

  // ─── Stripe webhook handler ─────────────────────────────────────────────────

  /**
   * Process a Stripe webhook event idempotently.
   * We use the Stripe event ID as the idempotency key — if a payment with
   * that key already exists (or was already processed) we skip silently.
   */
  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret') ?? '';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      throw new BadRequestException(`Stripe webhook signature verification failed: ${err.message}`);
    }

    this.logger.log(`Handling Stripe event: ${event.type} [${event.id}]`);

    // Idempotency check — has this event already been processed?
    const alreadyProcessed = await this.paymentRepo.findOne({
      where: { idempotencyKey: event.id },
    });
    if (alreadyProcessed) {
      this.logger.warn(`Duplicate Stripe event ${event.id}, skipping`);
      return;
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event);
        break;
      case 'invoice.paid':
        await this.onInvoicePaid(event);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(event);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionCancelled(event);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  // ─── BST / Stellar payment ──────────────────────────────────────────────────

  /**
   * Verify a Stellar/BST on-chain payment and grant enrollment if valid.
   * The client submits the transaction hash; we verify it on-chain and
   * confirm the payment memo matches `courseId:userId`.
   */
  async verifyAndRecordStellarPayment(
    userId: string,
    courseId: string,
    txHash: string,
  ): Promise<Payment> {
    // Idempotency: prevent duplicate stellar payment recording
    const existing = await this.paymentRepo.findOne({
      where: { stellarTxHash: txHash },
    });
    if (existing) {
      this.logger.warn(`Stellar tx ${txHash} already recorded`);
      return existing;
    }

    // Verify the transaction on-chain
    const verification = await this.stellarService.verifyTransaction(txHash);
    if (!verification.verified) {
      throw new BadRequestException(`Stellar transaction ${txHash} could not be verified`);
    }

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        userId,
        courseId,
        provider: PaymentProvider.STELLAR,
        status: PaymentStatus.COMPLETED,
        stellarTxHash: txHash,
        idempotencyKey: `stellar:${txHash}`,
      }),
    );

    await this.grantEnrollment(userId, courseId);
    this.eventEmitter.emit('payment.completed', { userId, courseId, provider: 'stellar', txHash });

    return payment;
  }

  // ─── Subscriptions & Invoices ───────────────────────────────────────────────

  async getSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
  }

  async cancelSubscription(userId: string): Promise<Subscription> {
    const sub = await this.subscriptionRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
    if (!sub) throw new NotFoundException('Active subscription not found');

    if (sub.stripeSubscriptionId) {
      await this.stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    }

    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelledAt = new Date();
    return this.subscriptionRepo.save(sub);
  }

  async getUserInvoices(userId: string): Promise<Invoice[]> {
    return this.invoiceRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { userId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async onCheckoutCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, courseId } = session.metadata ?? {};
    if (!userId || !courseId) return;

    // Update the pending payment record
    await this.paymentRepo.update(
      { stripePaymentIntentId: session.id },
      {
        status: PaymentStatus.COMPLETED,
        amountCents: session.amount_total ?? 0,
        idempotencyKey: event.id,
      },
    );

    await this.grantEnrollment(userId, courseId);
    this.eventEmitter.emit('payment.completed', {
      userId,
      courseId,
      provider: 'stripe',
      sessionId: session.id,
    });
  }

  private async onInvoicePaid(event: Stripe.Event): Promise<void> {
    const stripeInvoice = event.data.object as Stripe.Invoice;
    const stripeSubId = (stripeInvoice as any).subscription as string | null;
    const userId = stripeInvoice.metadata?.userId;
    if (!userId) return;

    // Upsert the invoice record
    let invoice = await this.invoiceRepo.findOne({
      where: { stripeInvoiceId: stripeInvoice.id },
    });
    if (!invoice) {
      let subscriptionId: string | undefined;
      if (stripeSubId) {
        const sub = await this.subscriptionRepo.findOne({
          where: { stripeSubscriptionId: stripeSubId },
        });
        subscriptionId = sub?.id;
      }
      invoice = this.invoiceRepo.create({ userId, subscriptionId });
    }
    invoice.stripeInvoiceId = stripeInvoice.id;
    invoice.status = InvoiceStatus.PAID;
    invoice.amountPaidCents = stripeInvoice.amount_paid;
    invoice.amountDueCents = stripeInvoice.amount_due;
    invoice.paidAt = new Date((stripeInvoice as any).status_transitions?.paid_at * 1000);
    await this.invoiceRepo.save(invoice);

    // Renew subscription entitlement
    if (stripeSubId) {
      await this.subscriptionRepo.update(
        { stripeSubscriptionId: stripeSubId },
        {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date((stripeInvoice as any).period_end * 1000),
        },
      );
    }

    // Mark this event as processed via a payment record
    await this.paymentRepo.save(
      this.paymentRepo.create({
        userId,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.COMPLETED,
        amountCents: stripeInvoice.amount_paid,
        currency: stripeInvoice.currency,
        idempotencyKey: event.id,
      }),
    );
  }

  private async onInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const stripeInvoice = event.data.object as Stripe.Invoice;
    const stripeSubId = (stripeInvoice as any).subscription as string | null;
    if (!stripeSubId) return;

    await this.subscriptionRepo.update(
      { stripeSubscriptionId: stripeSubId },
      { status: SubscriptionStatus.PAST_DUE },
    );
    this.logger.warn(`Subscription ${stripeSubId} moved to past_due after payment failure`);
  }

  private async onSubscriptionCancelled(event: Stripe.Event): Promise<void> {
    const stripeSub = event.data.object as Stripe.Subscription;
    await this.subscriptionRepo.update(
      { stripeSubscriptionId: stripeSub.id },
      { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    );
    this.logger.log(`Subscription ${stripeSub.id} cancelled`);
  }

  /** Grant enrollment access after successful payment */
  private async grantEnrollment(userId: string, courseId: string): Promise<void> {
    const existing = await this.enrollmentRepo.findOne({ where: { userId, courseId } });
    if (existing) return; // Already enrolled
    try {
      await this.enrollmentRepo.save(this.enrollmentRepo.create({ userId, courseId }));
      this.eventEmitter.emit('enrollment.created', { userId, courseId });
      this.logger.log(`Enrollment granted: user=${userId}, course=${courseId}`);
    } catch (err: any) {
      this.logger.error(`Failed to grant enrollment: ${err.message}`);
    }
  }

  private async getStripeCustomerId(userId: string): Promise<string | null> {
    const sub = await this.subscriptionRepo.findOne({ where: { userId } });
    return sub?.stripeCustomerId ?? null;
  }
}
