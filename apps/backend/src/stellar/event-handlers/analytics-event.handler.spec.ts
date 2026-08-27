import { Test, TestingModule } from '@nestjs/testing';
import { SorobanRpc } from '@stellar/stellar-sdk';
import { AnalyticsEventHandler } from './analytics-event.handler';
import { CredentialsService } from '../../credentials/credentials.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersService } from '../../users/users.service';

describe('AnalyticsEventHandler', () => {
  let handler: AnalyticsEventHandler;
  let credentialsService: jest.Mocked<CredentialsService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsEventHandler,
        {
          provide: CredentialsService,
          useValue: { issue: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { onCredentialIssued: jest.fn() },
        },
        {
          provide: UsersService,
          useValue: { findByStellarPublicKey: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<AnalyticsEventHandler>(AnalyticsEventHandler);
    credentialsService = module.get(CredentialsService) as jest.Mocked<CredentialsService>;
    notificationsService = module.get(NotificationsService) as jest.Mocked<NotificationsService>;
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should identify analytics:completed events', () => {
    expect(handler.canHandle('analytics', 'completed')).toBe(true);
    expect(handler.canHandle('analytics', 'other')).toBe(false);
    expect(handler.canHandle('token', 'completed')).toBe(false);
  });

  it('should handle valid analytics:completed event', async () => {
    const mockUser = { id: 'user-123' };
    usersService.findByStellarPublicKey.mockResolvedValue(mockUser as any);
    credentialsService.issue.mockResolvedValue(undefined);
    notificationsService.onCredentialIssued.mockResolvedValue(undefined);

    const mockEvent = {
      value: {
        value: () => ({
          student: { toString: () => 'GBSTU6...' },
          course: { toString: () => 'course-456' },
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await handler.handle(mockEvent);

    expect(usersService.findByStellarPublicKey).toHaveBeenCalledWith('GBSTU6...');
    expect(credentialsService.issue).toHaveBeenCalledWith('user-123', 'course-456', 'GBSTU6...');
    expect(notificationsService.onCredentialIssued).toHaveBeenCalledWith('user-123', 'course-456');
  });

  it('should skip event with missing student key', async () => {
    const mockEvent = {
      value: {
        value: () => ({
          student: undefined,
          course: { toString: () => 'course-456' },
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await handler.handle(mockEvent);

    expect(usersService.findByStellarPublicKey).not.toHaveBeenCalled();
    expect(credentialsService.issue).not.toHaveBeenCalled();
  });

  it('should skip event with missing course id', async () => {
    const mockEvent = {
      value: {
        value: () => ({
          student: { toString: () => 'GBSTU6...' },
          course: undefined,
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await handler.handle(mockEvent);

    expect(usersService.findByStellarPublicKey).toHaveBeenCalledWith('GBSTU6...');
    expect(credentialsService.issue).not.toHaveBeenCalled();
  });

  it('should skip event when user not found', async () => {
    usersService.findByStellarPublicKey.mockResolvedValue(null);

    const mockEvent = {
      value: {
        value: () => ({
          student: { toString: () => 'GBSTU6...' },
          course: { toString: () => 'course-456' },
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await handler.handle(mockEvent);

    expect(usersService.findByStellarPublicKey).toHaveBeenCalledWith('GBSTU6...');
    expect(credentialsService.issue).not.toHaveBeenCalled();
    expect(notificationsService.onCredentialIssued).not.toHaveBeenCalled();
  });

  it('should handle service errors', async () => {
    const mockUser = { id: 'user-123' };
    usersService.findByStellarPublicKey.mockResolvedValue(mockUser as any);
    credentialsService.issue.mockRejectedValue(new Error('Issue failed'));

    const mockEvent = {
      value: {
        value: () => ({
          student: { toString: () => 'GBSTU6...' },
          course: { toString: () => 'course-456' },
        }),
      },
    } as any as SorobanRpc.Api.EventResponse;

    await expect(handler.handle(mockEvent)).rejects.toThrow('Issue failed');
  });

  describe('Sample Event Payloads', () => {
    it('should handle real-world analytics:completed payload', async () => {
      const mockUser = { id: 'user-123', email: 'student@example.com' };
      usersService.findByStellarPublicKey.mockResolvedValue(mockUser as any);
      credentialsService.issue.mockResolvedValue(undefined);
      notificationsService.onCredentialIssued.mockResolvedValue(undefined);

      // Realistic Soroban event payload
      const mockEvent = {
        id: '123456789-0',
        ledger: 28374652,
        ledgerCloseTime: 1693425600,
        contractId: 'CA52J....',
        type: 'contract',
        topic: [
          { value: () => 'analytics' },
          { value: () => 'completed' },
          { value: () => 'GBSTU6VN...' },
        ],
        value: {
          value: () => ({
            student: { toString: () => 'GBSTU6VN47F4C5LT32LNQDRMQ7A4MSNQ4LWYFWV72UKGE63LTSBVUON' },
            course: { toString: () => 'blockchain-101' },
          }),
        },
      } as any as SorobanRpc.Api.EventResponse;

      await handler.handle(mockEvent);

      expect(usersService.findByStellarPublicKey).toHaveBeenCalledWith(
        'GBSTU6VN47F4C5LT32LNQDRMQ7A4MSNQ4LWYFWV72UKGE63LTSBVUON'
      );
      expect(credentialsService.issue).toHaveBeenCalledWith(
        'user-123',
        'blockchain-101',
        'GBSTU6VN47F4C5LT32LNQDRMQ7A4MSNQ4LWYFWV72UKGE63LTSBVUON'
      );
    });
  });
});
