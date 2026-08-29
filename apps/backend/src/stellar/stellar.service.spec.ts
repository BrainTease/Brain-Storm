import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { SorobanRpcClientService } from './soroban-rpc-client.service';
import {
  StellarTransactionLog,
  StellarTxType,
  StellarTxStatus,
} from './stellar-transaction-log.entity';
import { Horizon, Keypair, TransactionBuilder, Operation } from '@stellar/stellar-sdk';

/**
 * Unit / integration coverage for the badge-award (credential-issuance)
 * workflow that bridges the backend to the Stellar network:
 *
 *   ProgressService.record() -> CredentialsService.issue()
 *     -> StellarService.issueCredential()
 *        -> SorobanRpcClientService.recordProgress()  (on-chain contract call)
 *           - on success: falls straight through
 *           - on failure: falls back to a Horizon manageData tx
 *              (issueCredentialFallback)
 *        -> mintCredentialViaHorizon() (always runs, unconditionally)
 *        -> logTransaction() (best-effort, swallows its own failures)
 *
 * Note: the previous version of this file instantiated the service with
 * `new StellarService()` (zero arguments), while the real constructor
 * requires four injected dependencies (ConfigService, CACHE_MANAGER,
 * the StellarTransactionLog repository, and SorobanRpcClientService).
 * That call site does not even satisfy the TypeScript constructor
 * signature, so `npx jest src/stellar/stellar.service.spec.ts` failed at
 * compile time (TS2554) before a single test could run. This file fixes
 * the setup to build the service through Nest's testing module with all
 * four dependencies properly mocked, and adds deterministic coverage for
 * the badge-award workflow described above.
 */

type MockServer = {
  loadAccount: jest.Mock;
  submitTransaction: jest.Mock;
  transactions: jest.Mock;
};

type MockTx = {
  sign: jest.Mock;
};

jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual('@stellar/stellar-sdk');
  return {
    ...actual,
    Horizon: {
      Server: jest.fn(),
    },
    Keypair: {
      fromSecret: jest.fn(),
    },
    Networks: {
      TESTNET: 'TESTNET',
      PUBLIC: 'PUBLIC',
    },
    TransactionBuilder: jest.fn(),
    BASE_FEE: 100,
    Operation: {
      manageData: jest.fn(),
    },
  };
});

describe('StellarService', () => {
  let service: StellarService;
  let mockServer: MockServer;
  let mockConfigService: { get: jest.Mock };
  let mockCacheManager: { get: jest.Mock; set: jest.Mock };
  let mockTxLogRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let mockSorobanRpc: {
    recordProgress: jest.Mock;
    getTokenBalance: jest.Mock;
    mintReward: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockServer = {
      loadAccount: jest.fn(),
      submitTransaction: jest.fn(),
      transactions: jest.fn(),
    };
    (Horizon.Server as jest.Mock).mockImplementation(() => mockServer);

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'stellar.network') return 'testnet';
        if (key === 'stellar.secretKey') return 'SXXXX';
        return undefined;
      }),
    };
    mockCacheManager = { get: jest.fn(), set: jest.fn() };
    mockTxLogRepo = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
    };
    mockSorobanRpc = {
      recordProgress: jest.fn(),
      getTokenBalance: jest.fn(),
      mintReward: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        {
          provide: getRepositoryToken(StellarTransactionLog),
          useValue: mockTxLogRepo,
        },
        { provide: SorobanRpcClientService, useValue: mockSorobanRpc },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  it('getAccountBalance should return balances from horizon account', async () => {
    const balances = [{ asset_type: 'native', balance: '100' }];
    mockServer.loadAccount.mockResolvedValue({ balances });

    await expect(service.getAccountBalance('GDEST')).resolves.toEqual(balances);
    expect(mockServer.loadAccount).toHaveBeenCalledWith('GDEST');
  });

  describe('issueCredential (badge-award workflow)', () => {
    const recipientPublicKey = 'GDEST';
    const courseId = 'course-1';
    let issuerKeypair: { publicKey: jest.Mock };
    let issuerAccount: { accountId: string };

    beforeEach(() => {
      issuerKeypair = { publicKey: jest.fn().mockReturnValue('GISSUER') };
      (Keypair.fromSecret as jest.Mock).mockReturnValue(issuerKeypair);

      issuerAccount = { accountId: 'GISSUER' };
      mockServer.loadAccount.mockResolvedValue(issuerAccount);

      (Operation.manageData as jest.Mock).mockImplementation((input) => input);

      (TransactionBuilder as unknown as jest.Mock).mockImplementation(() => {
        const builtTx: MockTx = { sign: jest.fn() };
        return {
          addOperation: jest.fn().mockReturnThis(),
          setTimeout: jest.fn().mockReturnThis(),
          build: jest.fn().mockReturnValue(builtTx),
        };
      });
    });

    it('when the Soroban contract call succeeds: skips the Horizon fallback, still mints via Horizon, and logs a SUCCESS credential tx', async () => {
      mockSorobanRpc.recordProgress.mockResolvedValue('soroban-tx-hash');
      mockServer.submitTransaction.mockResolvedValue({ hash: 'MINT_HASH' });

      const result = await service.issueCredential(recipientPublicKey, courseId);

      expect(mockSorobanRpc.recordProgress).toHaveBeenCalledWith(recipientPublicKey, courseId, 100);
      // Only mintCredentialViaHorizon submits a tx; the fallback manageData
      // tx (issueCredentialFallback) must NOT be triggered.
      expect(mockServer.submitTransaction).toHaveBeenCalledTimes(1);
      expect(result).toBe('MINT_HASH');

      expect(mockTxLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StellarTxType.CREDENTIAL,
          txHash: 'MINT_HASH',
          recipientPublicKey,
          courseId,
          status: StellarTxStatus.SUCCESS,
        })
      );
      expect(mockTxLogRepo.save).toHaveBeenCalledTimes(1);
    });

    it('when the Soroban contract call rejects: exercises the Horizon fallback but still proceeds to mint via Horizon and returns a hash', async () => {
      mockSorobanRpc.recordProgress.mockRejectedValue(new Error('soroban rpc down'));
      mockServer.submitTransaction
        .mockResolvedValueOnce({ hash: 'FALLBACK_HASH' }) // issueCredentialFallback
        .mockResolvedValueOnce({ hash: 'MINT_HASH' }); // mintCredentialViaHorizon

      const result = await service.issueCredential(recipientPublicKey, courseId);

      expect(mockSorobanRpc.recordProgress).toHaveBeenCalledWith(recipientPublicKey, courseId, 100);
      // Failure of the on-chain contract call is non-fatal: the fallback
      // manageData tx runs (1st submitTransaction call), then
      // mintCredentialViaHorizon still runs unconditionally (2nd call).
      expect(mockServer.submitTransaction).toHaveBeenCalledTimes(2);
      expect(result).toBe('MINT_HASH');

      expect(mockTxLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StellarTxType.CREDENTIAL,
          txHash: 'MINT_HASH',
          status: StellarTxStatus.SUCCESS,
        })
      );
    });

    it('swallows logTransaction failures (txLogRepo.save rejecting) without failing issueCredential', async () => {
      mockSorobanRpc.recordProgress.mockResolvedValue('soroban-tx-hash');
      mockServer.submitTransaction.mockResolvedValue({ hash: 'MINT_HASH' });
      mockTxLogRepo.save.mockRejectedValue(new Error('db unavailable'));

      await expect(service.issueCredential(recipientPublicKey, courseId)).resolves.toBe(
        'MINT_HASH'
      );
    });
  });

  describe('recordProgress', () => {
    it('delegates to sorobanRpc.recordProgress with the given args and returns its result', async () => {
      mockSorobanRpc.recordProgress.mockResolvedValue('progress-tx-hash');

      const result = await service.recordProgress('GSTUDENT', 'course-2', 55);

      expect(mockSorobanRpc.recordProgress).toHaveBeenCalledWith('GSTUDENT', 'course-2', 55);
      expect(result).toBe('progress-tx-hash');
    });
  });

  describe('mintReward', () => {
    it('delegates to sorobanRpc.mintReward with the given args and returns its result', async () => {
      mockSorobanRpc.mintReward.mockResolvedValue('reward-tx-hash');

      const result = await service.mintReward('GRECIPIENT', 50);

      expect(mockSorobanRpc.mintReward).toHaveBeenCalledWith('GRECIPIENT', 50);
      expect(result).toBe('reward-tx-hash');
    });
  });

  describe('getTokenBalance', () => {
    const pubKey = 'GBALANCE';
    const cacheKey = `token_balance:${pubKey}`;

    it('returns the cached value without calling sorobanRpc.getTokenBalance on a cache hit', async () => {
      mockCacheManager.get.mockResolvedValue('1000');

      const result = await service.getTokenBalance(pubKey);

      expect(result).toBe('1000');
      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(mockSorobanRpc.getTokenBalance).not.toHaveBeenCalled();
    });

    it('calls sorobanRpc.getTokenBalance and caches the result with a 30s TTL on a cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockSorobanRpc.getTokenBalance.mockResolvedValue('2500');

      const result = await service.getTokenBalance(pubKey);

      expect(mockSorobanRpc.getTokenBalance).toHaveBeenCalledWith(pubKey);
      expect(mockCacheManager.set).toHaveBeenCalledWith(cacheKey, '2500', 30_000);
      expect(result).toBe('2500');
    });
  });

  describe('verifyTransaction', () => {
    it('returns verification details when the Horizon lookup succeeds', async () => {
      const callMock = jest.fn().mockResolvedValue({
        successful: true,
        hash: 'TX_HASH',
        ledger_attr: 12345,
        created_at: '2026-01-01T00:00:00Z',
        operation_count: 2,
      });
      mockServer.transactions.mockReturnValue({
        transaction: jest.fn().mockReturnValue({ call: callMock }),
      });

      const result = await service.verifyTransaction('TX_HASH');

      expect(result).toEqual({
        verified: true,
        hash: 'TX_HASH',
        ledger: 12345,
        createdAt: '2026-01-01T00:00:00Z',
        operationCount: 2,
      });
    });

    it('returns {verified: false, hash} without throwing when the Horizon call throws', async () => {
      const callMock = jest.fn().mockRejectedValue(new Error('tx not found'));
      mockServer.transactions.mockReturnValue({
        transaction: jest.fn().mockReturnValue({ call: callMock }),
      });

      await expect(service.verifyTransaction('MISSING_HASH')).resolves.toEqual({
        verified: false,
        hash: 'MISSING_HASH',
      });
    });
  });

  describe('getTransactionLogs', () => {
    it('applies the provided filters, orders by createdAt DESC, and caps at take: 100', async () => {
      const logs = [{ id: 'log-1' }] as StellarTransactionLog[];
      mockTxLogRepo.find.mockResolvedValue(logs);
      const filters = {
        recipientPublicKey: 'GDEST',
        type: StellarTxType.CREDENTIAL,
        status: StellarTxStatus.SUCCESS,
      };

      const result = await service.getTransactionLogs(filters);

      expect(result).toEqual(logs);
      expect(mockTxLogRepo.find).toHaveBeenCalledWith({
        where: filters,
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });

    it('defaults to an empty where clause when no filters are given', async () => {
      mockTxLogRepo.find.mockResolvedValue([]);

      await service.getTransactionLogs();

      expect(mockTxLogRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });
  });

  describe('issueCredential legacy transaction-building assertions', () => {
    it('issueCredential should submit a transaction and return hash (retained regression coverage)', async () => {
      const issuerKeypair = {
        publicKey: jest.fn().mockReturnValue('GISSUER'),
      };
      (Keypair.fromSecret as jest.Mock).mockReturnValue(issuerKeypair);

      const issuerAccount = { accountId: 'GISSUER' };
      mockServer.loadAccount.mockResolvedValue(issuerAccount);

      const signMock = jest.fn();
      const builtTx = { sign: signMock } as MockTx;

      const addOperation = jest.fn().mockReturnThis();
      const setTimeout = jest.fn().mockReturnThis();
      const build = jest.fn().mockReturnValue(builtTx);

      (TransactionBuilder as unknown as jest.Mock).mockImplementation(() => ({
        addOperation,
        setTimeout,
        build,
      }));

      (Operation.manageData as jest.Mock).mockImplementation((input) => input);

      mockSorobanRpc.recordProgress.mockResolvedValue('soroban-ok');
      mockServer.submitTransaction.mockResolvedValue({ hash: 'FAKE_HASH' });

      const result = await service.issueCredential('GDEST', 'course-1');

      expect(result).toBe('FAKE_HASH');
      expect(mockServer.loadAccount).toHaveBeenCalledWith('GISSUER');
      expect(TransactionBuilder).toHaveBeenCalledWith(issuerAccount, {
        fee: 100,
        networkPassphrase: 'TESTNET',
      });
      expect(addOperation).toHaveBeenCalledWith({
        name: 'brain-storm:credential:course-1',
        value: 'GDEST',
      });
      expect(setTimeout).toHaveBeenCalledWith(30);
      expect(build).toHaveBeenCalled();
      expect(signMock).toHaveBeenCalledWith(issuerKeypair);
      expect(mockServer.submitTransaction).toHaveBeenCalledWith(builtTx);
    });
  });
});
