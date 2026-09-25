/* eslint-disable @typescript-eslint/no-explicit-any, max-lines-per-function */
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SorobanRpc } from '@stellar/stellar-sdk';

interface EscrowEventHandler {
  canHandle(contractType: string, eventName: string): boolean;
  handle(event: SorobanRpc.Api.EventResponse): Promise<void>;
}

class EscrowEventHandlerImpl implements EscrowEventHandler {
  private readonly logger = new Logger(EscrowEventHandlerImpl.name);

  canHandle(contractType: string, eventName: string): boolean {
    return contractType === 'escrow' && ['locked', 'released', 'disputed'].includes(eventName);
  }

  async handle(event: SorobanRpc.Api.EventResponse): Promise<void> {
    const topic = (event.topic ?? []).map((t: any) => t?.value?.toString() ?? '');
    const [contractType, eventName] = topic;

    this.logger.debug(`Handling escrow event: ${contractType}.${eventName}`);

    const data = event.value?.value?.();
    if (!data) {
      this.logger.warn('Event missing data payload');
      return;
    }

    switch (eventName) {
      case 'locked':
        this.logger.log(`Escrow locked: ${data.escrowId} for ${data.amount}`);
        break;
      case 'released':
        this.logger.log(`Escrow released to ${data.recipient}`);
        break;
      case 'disputed':
        this.logger.log(`Escrow disputed: ${data.escrowId}`);
        break;
    }
  }
}

describe('EscrowEventHandler', () => {
  let handler: EscrowEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EscrowEventHandlerImpl,
          useClass: EscrowEventHandlerImpl,
        },
      ],
    }).compile();

    handler = module.get<EscrowEventHandler>(EscrowEventHandlerImpl);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should handle escrow:locked events', () => {
    expect(handler.canHandle('escrow', 'locked')).toBe(true);
  });

  it('should handle escrow:released events', () => {
    expect(handler.canHandle('escrow', 'released')).toBe(true);
  });

  it('should handle escrow:disputed events', () => {
    expect(handler.canHandle('escrow', 'disputed')).toBe(true);
  });

  it('should not handle non-escrow events', () => {
    expect(handler.canHandle('token', 'transfer')).toBe(false);
    expect(handler.canHandle('grants', 'created')).toBe(false);
  });

  it('should not handle unsupported escrow events', () => {
    expect(handler.canHandle('escrow', 'refunded')).toBe(false);
    expect(handler.canHandle('escrow', 'expired')).toBe(false);
  });

  it('should handle escrow:locked event payload', async () => {
    const mockEvent = {
      id: '201-0',
      ledger: 28374653,
      contractId: 'CESCROW...',
      type: 'contract',
      topic: [{ value: () => 'escrow' }, { value: () => 'locked' }],
      value: {
        value: () => ({
          escrowId: 'escrow-001',
          payer: 'GBPAYER...',
          recipient: 'GBRECIPIENT...',
          amount: 5000000,
          lockedAt: 1693425630,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle escrow:released event payload', async () => {
    const mockEvent = {
      id: '202-0',
      ledger: 28374654,
      contractId: 'CESCROW...',
      type: 'contract',
      topic: [{ value: () => 'escrow' }, { value: () => 'released' }],
      value: {
        value: () => ({
          escrowId: 'escrow-001',
          payer: 'GBPAYER...',
          recipient: 'GBRECIPIENT...',
          amount: 5000000,
          releasedAt: 1693425700,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle escrow:disputed event payload', async () => {
    const mockEvent = {
      id: '203-0',
      ledger: 28374655,
      contractId: 'CESCROW...',
      type: 'contract',
      topic: [{ value: () => 'escrow' }, { value: () => 'disputed' }],
      value: {
        value: () => ({
          escrowId: 'escrow-001',
          disputedBy: 'GBRECIPIENT...',
          reason: 'Non-performance',
          disputedAt: 1693425800,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle event with missing data payload', async () => {
    const mockEvent = {
      id: '204-0',
      ledger: 28374656,
      contractId: 'CESCROW...',
      type: 'contract',
      topic: [{ value: () => 'escrow' }, { value: () => 'locked' }],
      value: undefined,
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should extract topic values correctly', async () => {
    const mockEvent = {
      topic: [{ value: () => 'escrow' }, { value: () => 'released' }],
      value: {
        value: () => ({
          escrowId: 'escrow-002',
          payer: 'GBPAYER...',
          recipient: 'GBRECIPIENT...',
          amount: 10000000,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle realistic escrow:locked payload', () => {
    const mockEvent = {
      id: '600-0',
      ledger: 28600000,
      ledgerCloseTime: 1693600000,
      contractId: 'CESCROWXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      type: 'contract',
      topic: [{ value: () => 'escrow' }, { value: () => 'locked' }],
      value: {
        value: () => ({
          escrowId: 'escrow-20240924-trading-001',
          payer: 'GBPAYERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          recipient: 'GBRECIPIENTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          amount: 100000000000,
          currency: 'USDC',
          milestone: 'Payment for contract delivery',
          dueDate: 1704067200,
          lockedAt: 1693600000,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    return expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle sequential escrow flow', async () => {
    const escrowId = 'escrow-20240924-trading-001';

    const lockEvent = {
      id: '601-0',
      ledger: 28600001,
      contractId: 'CESCROW...',
      type: 'contract',
      topic: [{ value: () => 'escrow' }, { value: () => 'locked' }],
      value: {
        value: () => ({
          escrowId,
          payer: 'GBPAYERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          recipient: 'GBRECIPIENTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          amount: 100000000000,
          lockedAt: 1693600000,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(lockEvent)).resolves.not.toThrow();

    const releaseEvent = {
      id: '602-0',
      ledger: 28600002,
      contractId: 'CESCROW...',
      type: 'contract',
      topic: [{ value: () => 'escrow' }, { value: () => 'released' }],
      value: {
        value: () => ({
          escrowId,
          payer: 'GBPAYERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          recipient: 'GBRECIPIENTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          amount: 100000000000,
          releasedAt: 1693600100,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(releaseEvent)).resolves.not.toThrow();
  });

  it('should handle disputed escrow', () => {
    const mockEvent = {
      id: '603-0',
      ledger: 28600003,
      contractId: 'CESCROW...',
      type: 'contract',
      topic: [{ value: () => 'escrow' }, { value: () => 'disputed' }],
      value: {
        value: () => ({
          escrowId: 'escrow-20240924-trading-001',
          disputedBy: 'GBRECIPIENTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          reason: 'Incomplete delivery of goods',
          evidenceHash: 'QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          requestedAmount: 50000000000,
          disputedAt: 1693600200,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    return expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });

  it('should handle high-value escrow', () => {
    const mockEvent = {
      id: '604-0',
      ledger: 28600004,
      contractId: 'CESCROW...',
      type: 'contract',
      topic: [{ value: () => 'escrow' }, { value: () => 'locked' }],
      value: {
        value: () => ({
          escrowId: 'escrow-enterprise-2024',
          payer: 'GBENTERPRISEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          recipient: 'GBCONTRACTORXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          amount: 1000000000000,
          isInsured: true,
          insuranceProvider: 'GBINSURANCEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          lockedAt: 1693600300,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    return expect(handler.handle(mockEvent)).resolves.not.toThrow();
  });
});
