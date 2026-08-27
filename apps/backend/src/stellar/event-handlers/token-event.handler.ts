import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SorobanRpc } from '@stellar/stellar-sdk';
import { ContractEventHandler } from './contract-event.dispatcher';

@Injectable()
export class TokenEventHandler implements ContractEventHandler {
  private readonly logger = new Logger(TokenEventHandler.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  canHandle(contractType: string, eventName: string): boolean {
    return contractType === 'token' && eventName === 'transfer';
  }

  async handle(event: SorobanRpc.Api.EventResponse): Promise<void> {
    const value = event.value?.value?.() as any;
    const toPublicKey: string = value?.to?.toString();

    if (!toPublicKey) {
      this.logger.debug(`Incomplete token:transfer event — missing recipient`);
      return;
    }

    await this.cacheManager.del(`token_balance:${toPublicKey}`);
    this.logger.log(`token:transfer — busted BST cache for ${toPublicKey}`);
  }
}
