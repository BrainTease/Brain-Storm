/**
 * Stellar Client Factory – Issue #983
 *
 * Provides centralized singleton instances of Horizon and Soroban RPC clients.
 * Eliminates duplicate client instantiation across the application.
 *
 * Problem it solves:
 * ─────────────────
 *  • Multiple services were each creating their own Horizon.Server and SorobanRpc.Server instances
 *  • Inconsistent configurations across different instantiations
 *  • Wasted resources due to multiple client instances
 *  • Difficult to manage and update client configurations
 *
 * Solution:
 * ────────
 *  • Single factory responsible for client creation and lifecycle
 *  • Lazy initialization: clients created only when first requested
 *  • Singleton pattern: same instance reused across the application
 *  • Centralized configuration management
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Horizon, SorobanRpc, Networks } from '@stellar/stellar-sdk';

@Injectable()
export class StellarClientFactory {
  private readonly logger = new Logger(StellarClientFactory.name);

  private horizonClient: Horizon.Server | null = null;
  private sorobanClient: SorobanRpc.Server | null = null;
  private networkPassphrase: string;
  private isTestnet: boolean;

  constructor(private configService: ConfigService) {
    this.isTestnet = this.configService.get<string>('stellar.network') !== 'mainnet';
    this.networkPassphrase = this.isTestnet ? Networks.TESTNET : Networks.PUBLIC;
    this.logger.log(`Stellar Client Factory initialized for ${this.isTestnet ? 'testnet' : 'mainnet'}`);
  }

  /**
   * Get singleton Horizon client instance
   * Creates on first call, returns cached instance on subsequent calls
   */
  getHorizonClient(): Horizon.Server {
    if (this.horizonClient) {
      return this.horizonClient;
    }

    const horizonUrl = this.isTestnet
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org';

    this.horizonClient = new Horizon.Server(horizonUrl);
    this.logger.log(`Horizon client created: ${horizonUrl}`);

    return this.horizonClient;
  }

  /**
   * Get singleton Soroban RPC client instance
   * Creates on first call, returns cached instance on subsequent calls
   */
  getSorobanClient(): SorobanRpc.Server {
    if (this.sorobanClient) {
      return this.sorobanClient;
    }

    const rpcUrl = this.configService.get<string>('stellar.sorobanRpcUrl') ?? '';
    if (!rpcUrl) {
      throw new Error('stellar.sorobanRpcUrl not configured');
    }

    this.sorobanClient = new SorobanRpc.Server(rpcUrl);
    this.logger.log(`Soroban RPC client created: ${rpcUrl}`);

    return this.sorobanClient;
  }

  /**
   * Get network passphrase (TESTNET or PUBLIC)
   */
  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  /**
   * Check if connected to testnet
   */
  isTestnetNetwork(): boolean {
    return this.isTestnet;
  }

  /**
   * Reset clients (useful for testing or reconfiguration)
   * WARNING: Use with caution in production
   */
  resetClients(): void {
    this.horizonClient = null;
    this.sorobanClient = null;
    this.logger.warn('Stellar clients have been reset');
  }
}
