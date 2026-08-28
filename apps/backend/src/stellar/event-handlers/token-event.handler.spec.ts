import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SorobanRpc } from '@stellar/stellar-sdk';
import { TokenEventHandler } from './token-event.handler';

describe('TokenEventHandler', () => {
  let handler: TokenEventHandler;
  let cacheManager: any;

  beforeEach(async () => {
    const mockCacheManager = {
      del: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenEventHandler,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    handler = module.get<TokenEventHandler>(TokenEventHandler);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should identify token:transfer events', () => {
    expect(handler.canHandle('token', 'transfer')).toBe(true);
    expect(handler.canHandle('token', 'approve')).toBe(false);
    expect(handler.canHandle('analytics', 'transfer')).toBe(false);
  });

  it('should handle valid token:transfer event', async () => {
    const mockEvent = {
      value: {
        value: () => ({
          to: { toString: () => 'GBRECVR...' },
          from: { toString: () => 'GBSENDER...' },
          amount: 1000,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await handler.handle(mockEvent);

    expect(cacheManager.del).toHaveBeenCalledWith('token_balance:GBRECVR...');
  });

  it('should skip event with missing recipient', async () => {
    const mockEvent = {
      value: {
        value: () => ({
          to: undefined,
          from: { toString: () => 'GBSENDER...' },
          amount: 1000,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await handler.handle(mockEvent);

    expect(cacheManager.del).not.toHaveBeenCalled();
  });

  it('should handle cache deletion errors gracefully', async () => {
    cacheManager.del.mockRejectedValue(new Error('Cache error'));

    const mockEvent = {
      value: {
        value: () => ({
          to: { toString: () => 'GBRECVR...' },
          from: { toString: () => 'GBSENDER...' },
          amount: 1000,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).rejects.toThrow('Cache error');
  });

  describe('Sample Event Payloads', () => {
    it('should handle real-world token:transfer payload', async () => {
      // Realistic Soroban token transfer event
      const mockEvent = {
        id: '987654321-0',
        ledger: 28374653,
        ledgerCloseTime: 1693425630,
        contractId: 'CBUDL...',
        type: 'contract',
        topic: [
          { value: () => 'token' },
          { value: () => 'transfer' },
          { value: () => 'GBSENDER...' },
          { value: () => 'GBRECVR...' },
        ],
        value: {
          value: () => ({
            from: { toString: () => 'GBSENDERABBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' },
            to: { toString: () => 'GBRECVRABBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' },
            amount: 50000000, // 5.0 BST tokens (8 decimals)
          }),
        },
      } as any as SorobanRpc.Api.EventResponse;

      await handler.handle(mockEvent);

      expect(cacheManager.del).toHaveBeenCalledWith('token_balance:GBRECVRABBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
    });

    it('should bust cache for multiple concurrent transfers', async () => {
      const recipients = [
        'GBRECVR1...',
        'GBRECVR2...',
        'GBRECVR3...',
      ];

      for (const recipient of recipients) {
        const mockEvent = {
          value: {
            value: () => ({
              to: { toString: () => recipient },
              from: { toString: () => 'GBSENDER...' },
              amount: 1000,
            }),
          },
        } as any as SorobanRpc.Api.EventResponse;

        await handler.handle(mockEvent);
      }

      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      recipients.forEach((recipient) => {
        expect(cacheManager.del).toHaveBeenCalledWith(`token_balance:${recipient}`);
      });
    });

    it('should handle edge case of zero-amount transfer', async () => {
      const mockEvent = {
        value: {
          value: () => ({
            to: { toString: () => 'GBRECVR...' },
            from: { toString: () => 'GBSENDER...' },
            amount: 0,
          }),
        },
      } as any as SorobanRpc.Api.EventResponse;

      await handler.handle(mockEvent);

      // Cache should still be busted even for zero transfers
      expect(cacheManager.del).toHaveBeenCalledWith('token_balance:GBRECVR...');
    });
  });
});
