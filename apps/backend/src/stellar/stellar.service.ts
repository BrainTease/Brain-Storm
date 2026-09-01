/**
 * StellarService – Horizon REST-API layer
 *
 * Handles all interactions with the Horizon HTTP API (account loading,
 * transaction submission via ManageData operations, friendbot funding,
 * and transaction verification).
 *
 * Soroban RPC calls (simulate, prepare, send, contract invocations) have been
 * extracted to SorobanRpcClientService (Issue #803).  StellarService delegates
 * to it instead of managing its own SorobanRpc.Server instance.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Horizon,
  Keypair,
  Networks,
  BASE_FEE,
  Operation,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';
import {
  StellarTransactionLog,
  StellarTxType,
  StellarTxStatus,
} from './stellar-transaction-log.entity';
import { SorobanRpcClientService } from './soroban-rpc-client.service';
import { StellarClientFactory } from './stellar-client.factory';
import { TransactionBuilderService } from './transaction-builder.service';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private server: Horizon.Server;
  private networkPassphrase: string;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(StellarTransactionLog)
    private readonly txLogRepo: Repository<StellarTransactionLog>,
    private readonly sorobanRpc: SorobanRpcClientService,
    private readonly clientFactory: StellarClientFactory,
    private readonly txBuilder: TransactionBuilderService
  ) {
    // Use centralized client factory instead of creating new instance
    this.server = this.clientFactory.getHorizonClient();
    this.networkPassphrase = this.clientFactory.getNetworkPassphrase();
    this.logger.log('StellarService initialized using StellarClientFactory');
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async getAccountBalance(publicKey: string) {
    const account = await this.server.loadAccount(publicKey);
    return account.balances;
  }

  async fundTestnetAccount(publicKey: string): Promise<{ message: string }> {
    const network = this.configService.get<string>('stellar.network');
    if (network !== 'testnet') {
      throw new Error('Friendbot is only available on testnet');
    }
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
    );
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Friendbot error: ${body}`);
    }
    await this.logTransaction({
      type: StellarTxType.FUND_TESTNET,
      recipientPublicKey: publicKey,
      status: StellarTxStatus.SUCCESS,
    });
    return { message: `Account ${publicKey} funded successfully` };
  }

  async mintCertificateNFT(
    recipientPublicKey: string,
    certificateHash: string,
    courseTitle: string
  ): Promise<string> {
    try {
      const issuerKeypair = this.getIssuerKeypair();

      const tx = await this.txBuilder.buildAndSignTransaction(
        issuerKeypair,
        [
          Operation.manageData({
            name: `brain-storm:cert:${certificateHash.slice(0, 28)}`,
            value: recipientPublicKey,
          }),
        ],
        { fee: BASE_FEE, timeout: 30 }
      );

      const result = await this.txBuilder.submitTransaction(tx);
      this.logger.log(`Certificate NFT minted: ${result.hash} for ${courseTitle}`);

      await this.logTransaction({
        type: StellarTxType.MINT_CERTIFICATE,
        txHash: result.hash,
        recipientPublicKey,
        status: StellarTxStatus.SUCCESS,
        metadata: { certificateHash, courseTitle },
      });

      return result.hash;
    } catch (error: unknown) {
      await this.logTransaction({
        type: StellarTxType.MINT_CERTIFICATE,
        recipientPublicKey,
        status: StellarTxStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: { certificateHash, courseTitle },
      });
      throw error;
    }
  }

  async issueCredential(recipientPublicKey: string, courseId: string): Promise<string> {
    try {
      // Delegate Soroban progress-recording to the dedicated RPC service
      await this.sorobanRpc.recordProgress(recipientPublicKey, courseId, 100);
      this.logger.log(`Progress recorded on Soroban for ${courseId}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to record progress on Soroban: ${errMsg}, falling back to Horizon`,
        errStack
      );
      await this.issueCredentialFallback(recipientPublicKey, courseId);
    }

    const txHash = await this.mintCredentialViaHorizon(recipientPublicKey, courseId);
    await this.logTransaction({
      type: StellarTxType.CREDENTIAL,
      txHash,
      recipientPublicKey,
      courseId,
      status: StellarTxStatus.SUCCESS,
    });
    return txHash;
  }

  /** Delegate to SorobanRpcClientService – record progress % on-chain. */
  async recordProgress(
    studentPublicKey: string,
    courseId: string,
    progressPct: number
  ): Promise<string> {
    return this.sorobanRpc.recordProgress(studentPublicKey, courseId, progressPct);
  }

  /**
   * Read BST balance for an address from the Token contract.
   * Caching is owned here so callers don't need to think about it.
   */
  async getTokenBalance(stellarPublicKey: string): Promise<string> {
    const cacheKey = `token_balance:${stellarPublicKey}`;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached !== undefined && cached !== null) return cached;

    const balance = await this.sorobanRpc.getTokenBalance(stellarPublicKey);
    await this.cacheManager.set(cacheKey, balance, 30_000);
    return balance;
  }

  /** Delegate to SorobanRpcClientService – mint reward tokens. */
  async mintReward(recipientPublicKey: string, amount: number): Promise<string> {
    return this.sorobanRpc.mintReward(recipientPublicKey, amount);
  }

  async verifyTransaction(txHash: string): Promise<{
    verified: boolean;
    hash: string;
    ledger?: number;
    createdAt?: string;
    operationCount?: number;
  }> {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();
      return {
        verified: tx.successful,
        hash: tx.hash,
        ledger: tx.ledger_attr,
        createdAt: tx.created_at,
        operationCount: tx.operation_count,
      };
    } catch (error: unknown) {
      this.logger.warn(
        `Transaction verification failed for ${txHash}: ${error instanceof Error ? error.message : String(error)}`
      );
      return { verified: false, hash: txHash };
    }
  }

  async getTransactionLogs(filters?: {
    recipientPublicKey?: string;
    type?: StellarTxType;
    status?: StellarTxStatus;
  }): Promise<StellarTransactionLog[]> {
    return this.txLogRepo.find({
      where: filters ?? {},
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async issueCredentialFallback(
    recipientPublicKey: string,
    courseId: string
  ): Promise<void> {
    const issuerKeypair = this.getIssuerKeypair();

    const tx = await this.txBuilder.buildAndSignTransaction(
      issuerKeypair,
      [
        Operation.manageData({
          name: `brain-storm:credential:${courseId}`,
          value: recipientPublicKey,
        }),
      ],
      { fee: BASE_FEE, timeout: 30 }
    );

    await this.txBuilder.submitTransaction(tx);
  }

  private async mintCredentialViaHorizon(
    recipientPublicKey: string,
    courseId: string
  ): Promise<string> {
    const issuerKeypair = this.getIssuerKeypair();

    const tx = await this.txBuilder.buildAndSignTransaction(
      issuerKeypair,
      [
        Operation.manageData({
          name: `brain-storm:credential:${courseId}`,
          value: recipientPublicKey,
        }),
      ],
      { fee: BASE_FEE, timeout: 30 }
    );

    const result = await this.txBuilder.submitTransaction(tx);
    this.logger.log(`Credential issued via Horizon: ${result.hash}`);
    return result.hash;
  }

  private async logTransaction(data: Partial<StellarTransactionLog>): Promise<void> {
    try {
      await this.txLogRepo.save(this.txLogRepo.create(data));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Failed to log transaction: ${errMsg}`, errStack);
    }
  }

  private getIssuerKeypair(): Keypair {
    const secret = this.configService.get<string>('stellar.secretKey') ?? '';
    return Keypair.fromSecret(secret);
  }
}
