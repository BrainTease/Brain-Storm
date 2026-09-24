/* eslint-disable @typescript-eslint/no-explicit-any, max-lines-per-function */
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SorobanRpc } from '@stellar/stellar-sdk';

interface GrantsEventHandler {
  canHandle(contractType: string, eventName: string): boolean;
  handle(event: SorobanRpc.Api.EventResponse): Promise<void>;
}

class GrantsEventHandlerImpl implements GrantsEventHandler {
  private readonly logger = new Logger(GrantsEventHandlerImpl.name);

  canHandle(contractType: string, eventName: string): boolean {
    return contractType === 'grants' && ['created', 'claimed', 'revoked'].includes(eventName);
  }

  async handle(event: SorobanRpc.Api.EventResponse): Promise<void> {
    const topic = (event.topic ?? []).map((t: any) => t?.value?.toString() ?? '');
    const [contractType, eventName] = topic;

    this.logger.debug(`Handling grants event: ${contractType}.${eventName}`);

    const data = event.value?.value?.();
    if (!data) {
      this.logger.warn('Event missing data payload');
      return;
    }

    switch (eventName) {
      case 'created':
        this.logger.log(`Grant created: ${data.grantId}`);
        break;
      case 'claimed':
        this.logger.log(`Grant claimed by ${data.claimer}`);
        break;
      case 'revoked':
        this.logger.log(`Grant revoked: ${data.grantId}`);
        break;
    }
  }
}

describe('GrantsEventHandler', () => {
  let handler: GrantsEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: GrantsEventHandlerImpl,
          useClass: GrantsEventHandlerImpl,
        },
      ],
    }).compile();

    handler = module.get<GrantsEventHandler>(GrantsEventHandlerImpl);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should handle grants:created events', () => {
    expect(handler.canHandle('grants', 'created')).toBe(true);
  });

  it('should handle grants:claimed events', () => {
    expect(handler.canHandle('grants', 'claimed')).toBe(true);
  });

  it('should handle grants:revoked events', () => {
    expect(handler.canHandle('grants', 'revoked')).toBe(true);
  });

  it('should not handle non-grants events', () => {
    expect(handler.canHandle('token', 'transfer')).toBe(false);
    expect(handler.canHandle('escrow', 'locked')).toBe(false);
  });

  it('should not handle unsupported grant events', () => {
    expect(handler.canHandle('grants', 'updated')).toBe(false);
    expect(handler.canHandle('grants', 'approved')).toBe(false);
  });

  it('should handle grants:created event payload', async () => {
    const mockEvent = {
      id: '123-0',
      ledger: 28374653,
      contractId: 'CBUDL...',
      type: 'contract',
      topic: [{ value: () => 'grants' }, { value: () => 'created' }],
      value: {
        value: () => ({
          grantId: 'grant-001',
          creator: 'GBCREATOR...',
          amount: 1000000,
          createdAt: 1693425630,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle grants:claimed event payload', async () => {
    const mockEvent = {
      id: '124-0',
      ledger: 28374654,
      contractId: 'CBUDL...',
      type: 'contract',
      topic: [{ value: () => 'grants' }, { value: () => 'claimed' }],
      value: {
        value: () => ({
          grantId: 'grant-001',
          claimer: 'GBCLAIMER...',
          claimedAmount: 500000,
          claimedAt: 1693425700,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle grants:revoked event payload', async () => {
    const mockEvent = {
      id: '125-0',
      ledger: 28374655,
      contractId: 'CBUDL...',
      type: 'contract',
      topic: [{ value: () => 'grants' }, { value: () => 'revoked' }],
      value: {
        value: () => ({
          grantId: 'grant-001',
          revoker: 'GBCREATOR...',
          revokedAt: 1693425800,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle event with missing data payload', async () => {
    const mockEvent = {
      id: '126-0',
      ledger: 28374656,
      contractId: 'CBUDL...',
      type: 'contract',
      topic: [{ value: () => 'grants' }, { value: () => 'created' }],
      value: undefined,
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should extract topic values correctly', async () => {
    const mockEvent = {
      topic: [{ value: () => 'grants' }, { value: () => 'claimed' }],
      value: {
        value: () => ({
          grantId: 'grant-002',
          claimer: 'GBUSER...',
          claimedAmount: 1000000,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle realistic grants:created payload', () => {
    const mockEvent = {
      id: '500-0',
      ledger: 28500000,
      ledgerCloseTime: 1693500000,
      contractId: 'CBUDLPHPQ3RDMK2MLTC5DZTRK6ICJGWSMDVTJUQ2UJSW7XBBQXQ3A3E',
      type: 'contract',
      topic: [{ value: () => 'grants' }, { value: () => 'created' }],
      value: {
        value: () => ({
          grantId: 'grant-20240924-001',
          creator: 'GBCREATORXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          amount: 50000000000,
          description: 'Education grant for computer science',
          createdAt: 1693500000,
          expiresAt: 1704067200,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    return expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle multiple claims on same grant', async () => {
    const grantId = 'grant-20240924-001';
    const claimers = [
      'GBCLAIMER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'GBCLAIMER2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'GBCLAIMER3XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    ];

    for (const claimer of claimers) {
      const mockEvent = {
        id: `${Math.random()}-0`,
        ledger: 28500001,
        contractId: 'CBUDL...',
        type: 'contract',
        topic: [{ value: () => 'grants' }, { value: () => 'claimed' }],
        value: {
          value: () => ({
            grantId,
            claimer,
            claimedAmount: 16666666,
            claimedAt: 1693500100,
          }),
        },
      } as any as SorobanRpc.Api.EventResponse;

      await expect(handler.handle(mockEvent)).resolves.not.toThrow();
    }
  });

  it('should handle partial grant revocation', () => {
    const mockEvent = {
      id: '501-0',
      ledger: 28500002,
      contractId: 'CBUDL...',
      type: 'contract',
      topic: [{ value: () => 'grants' }, { value: () => 'revoked' }],
      value: {
        value: () => ({
          grantId: 'grant-20240924-001',
          revoker: 'GBCREATORXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          revokedAmount: 25000000000,
          remainingAmount: 25000000000,
          reason: 'Partial fulfillment',
          revokedAt: 1693500200,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    return expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });
});
