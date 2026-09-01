import { Test, TestingModule } from '@nestjs/testing';
import { SorobanRpc } from '@stellar/stellar-sdk';
import { ContractEventDispatcher } from './contract-event.dispatcher';

describe('ContractEventDispatcher', () => {
  let dispatcher: ContractEventDispatcher;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContractEventDispatcher],
    }).compile();

    dispatcher = module.get<ContractEventDispatcher>(ContractEventDispatcher);
  });

  it('should be defined', () => {
    expect(dispatcher).toBeDefined();
  });

  it('should register and dispatch to matching handler', async () => {
    const mockHandler = {
      canHandle: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockResolvedValue(undefined),
    };

    dispatcher.register(mockHandler);

    const mockEvent = {
      topic: [
        { value: () => 'analytics' },
        { value: () => 'completed' },
      ],
    } as any as SorobanRpc.Api.EventResponse;

    await dispatcher.dispatch(mockEvent);

    expect(mockHandler.canHandle).toHaveBeenCalledWith('analytics', 'completed');
    expect(mockHandler.handle).toHaveBeenCalledWith(mockEvent);
  });

  it('should not dispatch to non-matching handler', async () => {
    const mockHandler = {
      canHandle: jest.fn().mockReturnValue(false),
      handle: jest.fn(),
    };

    dispatcher.register(mockHandler);

    const mockEvent = {
      topic: [
        { value: () => 'analytics' },
        { value: () => 'completed' },
      ],
    } as any as SorobanRpc.Api.EventResponse;

    await dispatcher.dispatch(mockEvent);

    expect(mockHandler.canHandle).toHaveBeenCalled();
    expect(mockHandler.handle).not.toHaveBeenCalled();
  });

  it('should use first matching handler', async () => {
    const handler1 = {
      canHandle: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockResolvedValue(undefined),
    };

    const handler2 = {
      canHandle: jest.fn().mockReturnValue(true),
      handle: jest.fn(),
    };

    dispatcher.register(handler1);
    dispatcher.register(handler2);

    const mockEvent = {
      topic: [
        { value: () => 'token' },
        { value: () => 'transfer' },
      ],
    } as any as SorobanRpc.Api.EventResponse;

    await dispatcher.dispatch(mockEvent);

    expect(handler1.handle).toHaveBeenCalledWith(mockEvent);
    expect(handler2.handle).not.toHaveBeenCalled();
  });

  it('should handle missing topic gracefully', async () => {
    const mockHandler = {
      canHandle: jest.fn(),
      handle: jest.fn(),
    };

    dispatcher.register(mockHandler);

    const mockEvent = {
      topic: [],
    } as any as SorobanRpc.Api.EventResponse;

    await dispatcher.dispatch(mockEvent);

    expect(mockHandler.canHandle).not.toHaveBeenCalled();
    expect(mockHandler.handle).not.toHaveBeenCalled();
  });

  it('should handle handler errors gracefully', async () => {
    const errorHandler = {
      canHandle: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockRejectedValue(new Error('Handler failed')),
    };

    const fallbackHandler = {
      canHandle: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockResolvedValue(undefined),
    };

    dispatcher.register(errorHandler);
    dispatcher.register(fallbackHandler);

    const mockEvent = {
      topic: [
        { value: () => 'test' },
        { value: () => 'event' },
      ],
    } as any as SorobanRpc.Api.EventResponse;

    await dispatcher.dispatch(mockEvent);

    expect(errorHandler.handle).toHaveBeenCalled();
    // Second handler should not be called since first one matched (even though it failed)
    expect(fallbackHandler.handle).not.toHaveBeenCalled();
  });

  it('should extract topic values correctly', async () => {
    const mockHandler = {
      canHandle: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockResolvedValue(undefined),
    };

    dispatcher.register(mockHandler);

    const mockEvent = {
      topic: [
        { value: () => 'analytics' },
        { value: () => 'completed' },
      ],
    } as any as SorobanRpc.Api.EventResponse;

    await dispatcher.dispatch(mockEvent);

    expect(mockHandler.canHandle).toHaveBeenCalledWith('analytics', 'completed');
  });
});
