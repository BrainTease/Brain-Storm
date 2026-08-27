/**
 * SorobanRpcClientService – Issue #803
 *
 * Encapsulates all Soroban RPC communication (simulateTransaction,
 * prepareTransaction, sendTransaction, getAccount) in a single dedicated
 * service, separating it from the Horizon REST-API layer that lives in
 * StellarService.
 *
 * Responsibilities
 * ─────────────────
 *  • Initialise and expose the SorobanRpc.Server instance.
 *  • Provide typed helpers for contract invocation (invokeContract,
 *    simulateContract).
 *  • Own the retry-with-backoff logic for RPC calls.
 *  • Hold all Soroban-specific configuration (RPC URL, contract IDs).
 *
 * What it does NOT do
 * ───────────────────
 *  • It does NOT call Horizon.Server – that remains in StellarService.
 *  • It does NOT own transaction logging – that is StellarService's concern.
 *  • It does NOT perform cache management.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  SorobanRpc,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';
import { decodeBigIntValue } from './soroban-xdr.utils';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

@Injectable()
export class SorobanRpcClientService {
  private readonly logger = new Logger(SorobanRpcClientService.name);

  readonly server: SorobanRpc.Server;
  readonly networkPassphrase: string;
  readonly analyticsContractId: string;
  readonly tokenContractId: string;
  readonly contractId: string;

  constructor(private readonly configService: ConfigService) {
    const isTestnet = this.configService.get<string>('stellar.network') !== 'mainnet';

    this.networkPassphrase = isTestnet ? Networks.TESTNET : Networks.PUBLIC;

    const rpcUrl = this.configService.get<string>('stellar.sorobanRpcUrl') ?? '';
    this.server = new SorobanRpc.Server(rpcUrl);

    this.contractId = this.configService.get<string>('stellar.contractId') ?? '';
    this.analyticsContractId = this.configService.get<string>('stellar.analyticsContractId') ?? '';
    this.tokenContractId = this.configService.get<string>('stellar.tokenContractId') ?? '';
  }

  // ── Account ───────────────────────────────────────────────────────────────

  /**
   * Load a Soroban-aware account from the RPC node.
   * Wraps `SorobanRpc.Server.getAccount`.
   */
  async getAccount(publicKey: string): Promise<any> {
    return this.server.getAccount(publicKey);
  }

  // ── Contract invocation ───────────────────────────────────────────────────

  /**
   * Build, prepare, sign, and submit a contract-invocation transaction.
   * Returns the submitted transaction hash.
   *
   * Uses retryWithBackoff so transient RPC errors are handled transparently.
   */
  async invokeContract(contractId: string, method: string, args: any[]): Promise<string> {
    return this.retryWithBackoff(() => this.invokeContractOnce(contractId, method, args));
  }

  /**
   * Simulate a read-only contract call without submitting a transaction.
   * Throws if the simulation returns an error.
   */
  async simulateContract(
    contractId: string,
    method: string,
    args: any[]
  ): Promise<SorobanRpc.Api.SimulateTransactionSuccessResponse> {
    const issuerKeypair = this.getIssuerKeypair();
    const source = await this.server.getAccount(issuerKeypair.publicKey());

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

    const simResult = await this.server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error(`Soroban simulation error for ${method}@${contractId}: ${simResult.error}`);
    }

    return simResult as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  }

  // ── Convenience contract methods ──────────────────────────────────────────

  /**
   * Record student progress on the Analytics contract.
   */
  async recordProgress(
    studentPublicKey: string,
    courseId: string,
    progressPct: number
  ): Promise<string> {
    return this.invokeContract(this.analyticsContractId || this.contractId, 'record_progress', [
      new Address(studentPublicKey).toScVal(),
      nativeToScVal(courseId, { type: 'symbol' }),
      nativeToScVal(progressPct, { type: 'i32' }),
    ]);
  }

  /**
   * Read the BST token balance for an address (simulate, no fee).
   */
  async getTokenBalance(stellarPublicKey: string): Promise<string> {
    if (!this.tokenContractId) {
      throw new Error('TOKEN_CONTRACT_ID not configured');
    }

    const simResult = await this.simulateContract(this.tokenContractId, 'balance', [
      new Address(stellarPublicKey).toScVal(),
    ]);

    return decodeBigIntValue(simResult);
  }

  /**
   * Mint reward tokens to a recipient via the Token contract.
   */
  async mintReward(recipientPublicKey: string, amount: number): Promise<string> {
    if (!this.tokenContractId) {
      throw new Error('TOKEN_CONTRACT_ID not configured');
    }
    return this.invokeContract(this.tokenContractId, 'mint', [
      new Address(recipientPublicKey).toScVal(),
      nativeToScVal(amount, { type: 'i128' }),
    ]);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async invokeContractOnce(
    contractId: string,
    method: string,
    args: any[]
  ): Promise<string> {
    const issuerKeypair = this.getIssuerKeypair();
    const source = await this.server.getAccount(issuerKeypair.publicKey());

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

    const prepared = await this.server.prepareTransaction(tx);
    (prepared as any).sign(issuerKeypair);
    const result = await this.server.sendTransaction(prepared as any);
    this.logger.log(`Soroban contract call ${method}@${contractId} tx: ${result.hash}`);
    return result.hash;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      this.logger.warn(
        `Soroban RPC attempt ${attempt} failed (${error.message}), retrying in ${delay}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  private getIssuerKeypair(): Keypair {
    const secret = this.configService.get<string>('stellar.secretKey') ?? '';
    return Keypair.fromSecret(secret);
  }
}
