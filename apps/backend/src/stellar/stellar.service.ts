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
  TransactionBuilder,
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
  ) {
    const isTestnet = this.configService.get<string>('stellar.network') !== 'mainnet';
    this.networkPassphrase = isTestnet ? Networks.TESTNET : Networks.PUBLIC;

    this.server = new Horizon.Server(
      isTestnet
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org',
    );
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
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
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
    courseTitle: string,
  ): Promise<string> {
    try {
      const issuerKeypair = this.getIssuerKeypair();
      const issuerAccount = await this.server.loadAccount(issuerKeypair.publicKey());

      const tx = new TransactionBuilder(issuerAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.manageData({
            name: `brain-storm:cert:${certificateHash.slice(0, 28)}`,
            value: recipientPublicKey,
          }),
        )
        .setTimeout(30)
        .build();

      tx.sign(issuerKeypair);
      const result = await this.server.submitTransaction(tx);
      this.logger.log(`Certificate NFT minted: ${result.hash} for ${courseTitle}`);

      await this.logTransaction({
        type: StellarTxType.MINT_CERTIFICATE,
        txHash: result.hash,
        recipientPublicKey,
        status: StellarTxStatus.SUCCESS,
        metadata: { certificateHash, courseTitle },
      });

      return result.hash;
    } catch (error) {
      await this.logTransaction({
        type: StellarTxType.MINT_CERTIFICATE,
        recipientPublicKey,
        status: StellarTxStatus.FAILED,
        errorMessage: error.message,
        metadata: { certificateHash, courseTitle },
      });
      throw error;
    }
  }

  async issueCredential(
    recipientPublicKey: string,
    courseId: string,
  ): Promise<string> {
    try {
      // Delegate Soroban progress-recording to the dedicated RPC service
      await this.sorobanRpc.recordProgress(recipientPublicKey, courseId, 100);
      this.logger.log(`Progress recorded on Soroban for ${courseId}`);
    } catch (error) {
      this.logger.error(
        `Failed to record progress on Soroban: ${error.message}, falling back to Horizon`,
        error.stack,
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
    progressPct: number,
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
    } catch (error) {
      this.logger.warn(
        `Transaction verification failed for ${txHash}: ${error.message}`,
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
    courseId: string,
  ): Promise<void> {
    const issuerKeypair = this.getIssuerKeypair();
    const issuerAccount = await this.server.loadAccount(issuerKeypair.publicKey());

    const tx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: `brain-storm:credential:${courseId}`,
          value: recipientPublicKey,
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(issuerKeypair);
    await this.server.submitTransaction(tx);
  }

  private async mintCredentialViaHorizon(
    recipientPublicKey: string,
    courseId: string,
  ): Promise<string> {
    const issuerKeypair = this.getIssuerKeypair();
    const issuerAccount = await this.server.loadAccount(issuerKeypair.publicKey());

    const tx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: `brain-storm:credential:${courseId}`,
          value: recipientPublicKey,
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(issuerKeypair);
    const result = await this.server.submitTransaction(tx);
    this.logger.log(`Credential issued via Horizon: ${result.hash}`);
    return result.hash;
  }

  private async logTransaction(data: Partial<StellarTransactionLog>): Promise<void> {
    try {
      await this.txLogRepo.save(this.txLogRepo.create(data));
    } catch (err) {
      this.logger.error(`Failed to log transaction: ${err.message}`, err.stack);
    }
  }

  private getIssuerKeypair(): Keypair {
    const secret = this.configService.get<string>('stellar.secretKey') ?? '';
    return Keypair.fromSecret(secret);
  }
}
