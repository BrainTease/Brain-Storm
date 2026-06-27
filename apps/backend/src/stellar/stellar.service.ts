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
  SorobanRpc,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';
import {
  StellarTransactionLog,
  StellarTxType,
  StellarTxStatus,
} from './stellar-transaction-log.entity';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private server: Horizon.Server;
  private sorobanServer: SorobanRpc.Server;
  private networkPassphrase: string;
  private analyticsContractId: string;
  private tokenContractId: string;
  private contractId: string;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(StellarTransactionLog)
    private readonly txLogRepo: Repository<StellarTransactionLog>,
  ) {
    const isTestnet = this.configService.get<string>('stellar.network') !== 'mainnet';
    this.networkPassphrase = isTestnet ? Networks.TESTNET : Networks.PUBLIC;

    this.server = new Horizon.Server(
      isTestnet ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org'
    );

    const rpcUrl = this.configService.get<string>('stellar.sorobanRpcUrl') ?? '';
    this.sorobanServer = new SorobanRpc.Server(rpcUrl);

    this.contractId = this.configService.get<string>('stellar.contractId') ?? '';
    this.analyticsContractId = this.configService.get<string>('stellar.analyticsContractId') ?? '';
    this.tokenContractId = this.configService.get<string>('stellar.tokenContractId') ?? '';
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
    courseTitle: string,
  ): Promise<string> {
    try {
      const issuerKeypair = Keypair.fromSecret(
        this.configService.get<string>('stellar.secretKey') ?? '',
      );
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

  async issueCredential(recipientPublicKey: string, courseId: string): Promise<string> {
    try {
      await this.retryWithBackoff(() => this.recordProgressOnChain(recipientPublicKey, courseId));
      this.logger.log(`Progress recorded on Soroban for ${courseId}`);
    } catch (error) {
      this.logger.error(
        `Failed to record progress on Soroban: ${error.message}, falling back to Horizon`
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

  async recordProgress(
    studentPublicKey: string,
    courseId: string,
    _progressPct: number
  ): Promise<string> {
    return this.retryWithBackoff(() =>
      this.invokeContract(this.analyticsContractId ?? this.contractId, 'record_progress', [
        new Address(studentPublicKey).toScVal(),
        nativeToScVal(courseId, { type: 'symbol' }),
        nativeToScVal(_progressPct, { type: 'i32' }),
      ])
    );
  }

  /** Read BST balance for an address from the Token contract (read-only simulate) */
  async getTokenBalance(stellarPublicKey: string): Promise<string> {
    if (!this.tokenContractId) {
      throw new Error('TOKEN_CONTRACT_ID not configured');
    }

    const cacheKey = `token_balance:${stellarPublicKey}`;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached !== undefined && cached !== null) return cached;

    const issuerKeypair = Keypair.fromSecret(
      this.configService.get<string>('stellar.secretKey') ?? ''
    );
    const source = await this.sorobanServer.getAccount(issuerKeypair.publicKey());

    const tx = new TransactionBuilder(source as any, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: this.tokenContractId,
          function: 'balance',
          args: [new Address(stellarPublicKey).toScVal()],
        })
      )
      .setTimeout(30)
      .build();

    const simResult = await this.sorobanServer.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error(`Token balance simulation failed: ${simResult.error}`);
    }

    const retVal = (simResult as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
    const balance = retVal ? BigInt(retVal.value() as unknown as bigint).toString() : '0';

    await this.cacheManager.set(cacheKey, balance, 30_000);
    return balance;
  }

  /** Mint reward tokens via the Token Soroban contract */
  async mintReward(recipientPublicKey: string, amount: number): Promise<string> {
    if (!this.tokenContractId) {
      throw new Error('TOKEN_CONTRACT_ID not configured');
    }
    return this.retryWithBackoff(() =>
      this.invokeContract(this.tokenContractId, 'mint_reward', [
        new Address(recipientPublicKey).toScVal(),
        nativeToScVal(amount, { type: 'i128' }),
      ])
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async recordProgressOnChain(studentPublicKey: string, courseId: string): Promise<void> {
    await this.invokeContract(this.analyticsContractId ?? this.contractId, 'record_progress', [
      new Address(studentPublicKey).toScVal(),
      nativeToScVal(courseId, { type: 'symbol' }),
      nativeToScVal(100, { type: 'i32' }),
    ]);
  }

  private async issueCredentialFallback(
    recipientPublicKey: string,
    courseId: string
  ): Promise<void> {
    const issuerKeypair = Keypair.fromSecret(
      this.configService.get<string>('stellar.secretKey') ?? ''
    );
    const issuerAccount = await this.server.loadAccount(issuerKeypair.publicKey());

    const tx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: `brain-storm:credential:${courseId}`,
          value: recipientPublicKey,
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(issuerKeypair);
    await this.server.submitTransaction(tx);
  }

  private async invokeContract(contractId: string, method: string, args: any[]): Promise<string> {
    const issuerKeypair = Keypair.fromSecret(
      this.configService.get<string>('stellar.secretKey') ?? ''
    );
    const source = await this.sorobanServer.getAccount(issuerKeypair.publicKey());

    const tx = new TransactionBuilder(source as any, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: contractId,
          function: method,
          args,
        })
      )
      .setTimeout(30)
      .build();

    const prepared = await this.sorobanServer.prepareTransaction(tx);
    (prepared as any).sign(issuerKeypair);
    const result = await this.sorobanServer.sendTransaction(prepared as any);
    this.logger.log(`Contract ${method} tx: ${result.hash}`);
    return result.hash;
  }

  private async mintCredentialViaHorizon(
    recipientPublicKey: string,
    courseId: string
  ): Promise<string> {
    const issuerKeypair = Keypair.fromSecret(
      this.configService.get<string>('stellar.secretKey') ?? ''
    );
    const issuerAccount = await this.server.loadAccount(issuerKeypair.publicKey());

    const tx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: `brain-storm:credential:${courseId}`,
          value: recipientPublicKey,
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(issuerKeypair);
    const result = await this.server.submitTransaction(tx);
    this.logger.log(`Credential issued via Horizon: ${result.hash}`);
    return result.hash;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  private async logTransaction(data: Partial<StellarTransactionLog>): Promise<void> {
    try {
      await this.txLogRepo.save(this.txLogRepo.create(data));
    } catch (err) {
      this.logger.error(`Failed to log transaction: ${err.message}`);
    }
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
      this.logger.warn(`Transaction verification failed for ${txHash}: ${error.message}`);
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
}
