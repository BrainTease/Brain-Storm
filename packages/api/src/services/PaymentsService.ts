/**
 * PaymentsService - Handles payment operations
 * - Process payments via Stellar SDK
 * - Track transaction history
 * - Validate payment amounts
 * - Handle refunds
 */

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionHash?: string;
  timestamp: Date;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  payment?: Payment;
  error?: string;
}

export interface StellarMockSDK {
  submitTransaction: (transaction: any) => Promise<{ hash: string }>;
  validateAddress: (address: string) => boolean;
  getBalance: (address: string) => Promise<number>;
}

export class PaymentsService {
  private payments: Map<string, Payment>;
  private stellarSDK: StellarMockSDK;
  private minAmount: number;
  private maxAmount: number;
  private supportedCurrencies: Set<string>;

  constructor(stellarSDK: StellarMockSDK) {
    this.payments = new Map();
    this.stellarSDK = stellarSDK;
    this.minAmount = 0.001; // Minimum payment amount
    this.maxAmount = 1000000; // Maximum payment amount
    this.supportedCurrencies = new Set(['USD', 'EUR', 'XLM', 'USDC']);
    this.initializeMockPayments();
  }

  /**
   * Initialize mock payment history
   */
  private initializeMockPayments(): void {
    this.payments.set('payment-1', {
      id: 'payment-1',
      userId: 'user-1',
      amount: 100,
      currency: 'USD',
      status: 'completed',
      transactionHash: 'hash-123',
      timestamp: new Date('2024-01-01'),
      description: 'Course purchase',
    });
  }

  /**
   * Process a new payment
   */
  async processPayment(
    userId: string,
    amount: number,
    currency: string,
    description?: string
  ): Promise<PaymentResult> {
    // Validate inputs
    if (!userId || !amount || !currency) {
      return {
        success: false,
        error: 'User ID, amount, and currency are required',
      };
    }

    // Validate amount
    if (amount < this.minAmount) {
      return {
        success: false,
        error: `Amount must be at least ${this.minAmount}`,
      };
    }

    if (amount > this.maxAmount) {
      return {
        success: false,
        error: `Amount cannot exceed ${this.maxAmount}`,
      };
    }

    // Validate currency
    if (!this.supportedCurrencies.has(currency)) {
      return {
        success: false,
        error: `Currency ${currency} is not supported`,
      };
    }

    // Validate amount is positive
    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than zero',
      };
    }

    // Create payment record
    const paymentId = `payment-${Date.now()}`;
    const payment: Payment = {
      id: paymentId,
      userId,
      amount,
      currency,
      status: 'pending',
      timestamp: new Date(),
      description,
    };

    // Store payment
    this.payments.set(paymentId, payment);

    try {
      // Simulate Stellar SDK call
      const transaction = {
        destination: 'GBBD47UZQ2 JUPITER76F7DXO5OMMX3VEJZEKN5ZJJBTCYL4D4SHYWUN2J',
        amount,
        currency,
      };

      const result = await this.stellarSDK.submitTransaction(transaction);

      // Update payment with transaction hash
      payment.transactionHash = result.hash;
      payment.status = 'completed';
      this.payments.set(paymentId, payment);

      return {
        success: true,
        transactionId: result.hash,
        payment,
      };
    } catch (error: any) {
      // Update payment status to failed
      payment.status = 'failed';
      this.payments.set(paymentId, payment);

      return {
        success: false,
        error: error.message || 'Payment processing failed',
      };
    }
  }

  /**
   * Get payment by ID
   */
  getPayment(paymentId: string): Payment | null {
    return this.payments.get(paymentId) || null;
  }

  /**
   * Get all payments for a user
   */
  getUserPayments(userId: string): Payment[] {
    const userPayments: Payment[] = [];
    for (const payment of this.payments.values()) {
      if (payment.userId === userId) {
        userPayments.push(payment);
      }
    }
    return userPayments;
  }

  /**
   * Get payment history with filtering
   */
  getPaymentHistory(
    userId?: string,
    status?: string,
    limit: number = 10
  ): Payment[] {
    let history: Payment[] = [];

    for (const payment of this.payments.values()) {
      if (userId && payment.userId !== userId) continue;
      if (status && payment.status !== status) continue;
      history.push(payment);
    }

    // Sort by timestamp descending and limit
    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string): Promise<PaymentResult> {
    if (!paymentId) {
      return {
        success: false,
        error: 'Payment ID is required',
      };
    }

    const payment = this.payments.get(paymentId);

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.status === 'refunded') {
      return {
        success: false,
        error: 'Payment already refunded',
      };
    }

    if (payment.status === 'pending') {
      return {
        success: false,
        error: 'Cannot refund pending payment',
      };
    }

    if (payment.status === 'failed') {
      return {
        success: false,
        error: 'Cannot refund failed payment',
      };
    }

    try {
      // Simulate refund process
      const refundTransaction = {
        source: 'GBBD47UZQ2JUPITER76F7DXO5OMMX3VEJZEKN5ZJJBTCYL4D4SHYWUN2J',
        destination: payment.userId,
        amount: payment.amount,
        originalTransactionHash: payment.transactionHash,
      };

      const result = await this.stellarSDK.submitTransaction(refundTransaction);

      // Update payment status
      payment.status = 'refunded';
      payment.transactionHash = result.hash;
      this.payments.set(paymentId, payment);

      return {
        success: true,
        transactionId: result.hash,
        payment,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Refund processing failed',
      };
    }
  }

  /**
   * Calculate total payment amount for a user
   */
  calculateTotalAmount(userId: string, status?: string): number {
    let total = 0;

    for (const payment of this.payments.values()) {
      if (payment.userId === userId) {
        if (status === undefined || payment.status === status) {
          total += payment.amount;
        }
      }
    }

    return total;
  }

  /**
   * Validate wallet address
   */
  validateWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Stellar address format: starts with G and is 56 characters
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    return stellarAddressRegex.test(address);
  }

  /**
   * Check if currency is supported
   */
  isCurrencySupported(currency: string): boolean {
    return this.supportedCurrencies.has(currency);
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return Array.from(this.supportedCurrencies);
  }

  /**
   * Get payment statistics
   */
  getPaymentStatistics(userId?: string): {
    totalPayments: number;
    totalAmount: number;
    completedCount: number;
    failedCount: number;
    refundedCount: number;
  } {
    let totalPayments = 0;
    let totalAmount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let refundedCount = 0;

    for (const payment of this.payments.values()) {
      if (userId && payment.userId !== userId) continue;

      totalPayments++;
      totalAmount += payment.amount;

      if (payment.status === 'completed') completedCount++;
      else if (payment.status === 'failed') failedCount++;
      else if (payment.status === 'refunded') refundedCount++;
    }

    return {
      totalPayments,
      totalAmount,
      completedCount,
      failedCount,
      refundedCount,
    };
  }
}
