import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Horizon,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  FeeBumpTransaction,
  Transaction,
} from '@stellar/stellar-sdk';
import { StellarClientFactory } from './stellar-client.factory';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';

export interface TransactionBuildOptions {
  fee?: number;
  timeout?: number;
  maxFee?: number;
}

@Injectable()
export class TransactionBuilderService {
  private readonly logger = new Logger(TransactionBuilderService.name);
  private server: Horizon.Server;
  private networkPassphrase: string;
  private minFee: number;

  constructor(
    private configService: ConfigService,
    private clientFactory: StellarClientFactory,
    private structuredLogger: StructuredLoggerService
  ) {
    this.server = this.clientFactory.getHorizonClient();
    this.networkPassphrase = this.clientFactory.getNetworkPassphrase();
    this.minFee = this.configService.get<number>('stellar.minFee', BASE_FEE);
  }

  /**
   * Build a transaction with automatic sequence number retrieval and signing
   */
  async buildAndSignTransaction(
    issuerKeypair: Keypair,
    operations: Operation[],
    options: TransactionBuildOptions = {}
  ): Promise<Transaction<Keypair>> {
    const { fee = this.minFee, timeout = 30, maxFee } = options;

    const issuerAccount = await this.server.loadAccount(issuerKeypair.publicKey());
    const calculatedFee = this.calculateFee(operations, fee, maxFee);

    const tx = new TransactionBuilder(issuerAccount, {
      fee: calculatedFee,
      networkPassphrase: this.networkPassphrase,
    });

    // Add all operations
    for (const operation of operations) {
      tx.addOperation(operation);
    }

    const builtTx = tx.setTimeout(timeout).build();

    this.structuredLogger.debug('Transaction built', {
      issuer: issuerKeypair.publicKey(),
      operationCount: operations.length,
      fee: calculatedFee,
      seqNum: issuerAccount.sequenceNumber(),
    });

    // Sign transaction
    builtTx.sign(issuerKeypair);

    return builtTx;
  }

  /**
   * Build a transaction for a specific account (not necessarily the issuer)
   */
  async buildAndSignAccountTransaction(
    accountKeypair: Keypair,
    operations: Operation[],
    options: TransactionBuildOptions = {}
  ): Promise<Transaction<Keypair>> {
    const { fee = this.minFee, timeout = 30, maxFee } = options;

    const account = await this.server.loadAccount(accountKeypair.publicKey());
    const calculatedFee = this.calculateFee(operations, fee, maxFee);

    const tx = new TransactionBuilder(account, {
      fee: calculatedFee,
      networkPassphrase: this.networkPassphrase,
    });

    for (const operation of operations) {
      tx.addOperation(operation);
    }

    const builtTx = tx.setTimeout(timeout).build();

    this.structuredLogger.debug('Account transaction built', {
      account: accountKeypair.publicKey(),
      operationCount: operations.length,
      fee: calculatedFee,
    });

    builtTx.sign(accountKeypair);
    return builtTx;
  }

  /**
   * Build a fee-bump transaction for priority/retry scenarios
   */
  async buildAndSignFeeBumpTransaction(
    baseTx: Transaction<Keypair>,
    feeSourceKeypair: Keypair,
    maxFee: number
  ): Promise<FeeBumpTransaction<Keypair>> {
    if (maxFee < this.minFee) {
      throw new Error(`Fee must be at least ${this.minFee} stroops`);
    }

    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      feeSourceKeypair,
      maxFee,
      baseTx,
      this.networkPassphrase
    );

    this.structuredLogger.info('Fee-bump transaction created', {
      innerTxHash: baseTx.hash().toString('hex'),
      maxFee,
      feeSource: feeSourceKeypair.publicKey(),
    });

    feeBumpTx.sign(feeSourceKeypair);
    return feeBumpTx;
  }

  /**
   * Calculate optimal fee based on operation count
   */
  calculateFee(
    operations: Operation[],
    baseFee: number = this.minFee,
    maxFee?: number
  ): number {
    // Each operation adds to the base fee
    const operationCount = operations.length;
    const calculatedFee = baseFee * (operationCount + 1); // +1 for transaction envelope

    if (maxFee && calculatedFee > maxFee) {
      this.logger.warn(
        `Calculated fee ${calculatedFee} exceeds max fee ${maxFee}, using max fee`
      );
      return maxFee;
    }

    return calculatedFee;
  }

  /**
   * Retrieve current sequence number for an account
   */
  async getSequenceNumber(publicKey: string): Promise<string> {
    const account = await this.server.loadAccount(publicKey);
    return account.sequenceNumber();
  }

  /**
   * Check if a Horizon account exists
   */
  async accountExists(publicKey: string): Promise<boolean> {
    try {
      await this.server.loadAccount(publicKey);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create a ManageData operation for data storage
   */
  createManageDataOperation(
    name: string,
    value: string | null = null
  ): Operation {
    return Operation.manageData({
      name,
      value,
    });
  }

  /**
   * Create multiple operations in a transaction
   */
  createBatchOperations(
    operationBuilders: Array<() => Operation>
  ): Operation[] {
    return operationBuilders.map(builder => builder());
  }

  /**
   * Submit a signed transaction to the Stellar network
   */
  async submitTransaction(
    tx: Transaction<Keypair> | FeeBumpTransaction<Keypair>
  ): Promise<Horizon.SubmitTransactionResponse> {
    try {
      const txHash = tx.hash().toString('hex');
      this.structuredLogger.logTransaction('submit_attempt', txHash);

      const result = await this.server.submitTransaction(tx);

      this.structuredLogger.logTransaction('submit_success', txHash, {
        ledger: result.ledger,
        pagingToken: result.paging_token,
      });

      return result;
    } catch (error: unknown) {
      const txHash = tx.hash().toString('hex');
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.structuredLogger.error(`Transaction submission failed: ${errorMessage}`, error, {
        txHash,
      });

      throw error;
    }
  }
}
