import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  Request,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { SubscriptionPlan } from './subscription.entity';

class CreateCheckoutDto {
  @IsUUID() courseId: string;
  @IsString() priceId: string;
  @IsUrl() successUrl: string;
  @IsUrl() cancelUrl: string;
}

class CreateSubscriptionDto {
  @IsEnum(SubscriptionPlan) plan: SubscriptionPlan;
  @IsString() priceId: string;
  @IsString() paymentMethodId: string;
}

class VerifyStellarPaymentDto {
  @IsUUID() courseId: string;
  @IsString() txHash: string;
}

@ApiTags('payments')
@Controller('v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── Stripe fiat ──────────────────────────────────────────────────────────

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout session for a course purchase' })
  createCheckout(@Request() req: any, @Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckoutSession(
      req.user.userId,
      dto.courseId,
      dto.priceId,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe subscription (monthly or annual)' })
  createSubscription(@Request() req: any, @Body() dto: CreateSubscriptionDto) {
    return this.paymentsService.createSubscription(
      req.user.userId,
      dto.plan,
      dto.priceId,
      dto.paymentMethodId,
    );
  }

  @Get('subscriptions/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user\'s active subscription' })
  getMySubscription(@Request() req: any) {
    return this.paymentsService.getSubscription(req.user.userId);
  }

  @Delete('subscriptions/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel the current user\'s subscription' })
  cancelSubscription(@Request() req: any) {
    return this.paymentsService.cancelSubscription(req.user.userId);
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List invoices for the current user' })
  getInvoices(@Request() req: any) {
    return this.paymentsService.getUserInvoices(req.user.userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payment history for the current user' })
  getPaymentHistory(@Request() req: any) {
    return this.paymentsService.getUserPayments(req.user.userId);
  }

  // ─── Stripe webhook (raw body required) ──────────────────────────────────

  /**
   * Stripe delivers webhooks with a raw body for signature verification.
   * The `RawBodyRequest` type gives access to `req.rawBody` which must be
   * enabled via `app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }))`.
   */
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint (idempotent, verifies HMAC signature)' })
  async stripeWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentsService.handleStripeWebhook(req.rawBody!, signature);
    return { received: true };
  }

  // ─── BST / Stellar on-chain payment ───────────────────────────────────────

  @Post('stellar/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a BST/Stellar transaction and grant course access' })
  verifyStellarPayment(@Request() req: any, @Body() dto: VerifyStellarPaymentDto) {
    return this.paymentsService.verifyAndRecordStellarPayment(
      req.user.userId,
      dto.courseId,
      dto.txHash,
    );
  }
}
