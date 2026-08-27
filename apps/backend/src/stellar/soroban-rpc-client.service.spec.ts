/**
 * SorobanRpcClientService – Unit Tests (Issue #803)
 *
 * Verifies that the extracted service correctly encapsulates Soroban RPC
 * operations and does not depend on Horizon or any other service.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SorobanRpcClientService } from './soroban-rpc-client.service';

// ── Test keypair (real Stellar keys, testnet only) ────────────────────────
const TEST_PUBLIC_KEY = 'GBID6ZQ3HAFG5SWVGXCSVTD2WNJVAGUB24BP44XPVAG2YDOEJ2L2BKT2';
const TEST_SECRET_KEY = 'SCVWSIRWEMSG2ORTUT3RWJQ7ORSEFKJVCKR2NX6VD3LS22MI5HP73DFA';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockSorobanServer = {
  getAccount: jest.fn(),
  simulateTransaction: jest.fn(),
  prepareTransaction: jest.fn(),
  sendTransaction: jest.fn(),
};

// Mock SorobanRpc.Server so no real RPC connection is made
jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual('@stellar/stellar-sdk');
  return {
    ...actual,
    SorobanRpc: {
      ...actual.SorobanRpc,
      Server: jest.fn().mockImplementation(() => mockSorobanServer),
    },
  };
});

const MOCK_CONFIG: Record<string, string> = {
  'stellar.network': 'testnet',
  'stellar.sorobanRpcUrl': 'https://soroban-testnet.stellar.org',
  'stellar.contractId': 'CONTRACT_A',
  'stellar.analyticsContractId': 'CONTRACT_ANALYTICS',
  'stellar.tokenContractId': 'CONTRACT_TOKEN',
  'stellar.secretKey': TEST_SECRET_KEY,
};

const mockConfigService = {
  get: jest.fn((key: string) => MOCK_CONFIG[key] ?? null),
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('SorobanRpcClientService', () => {
  let service: SorobanRpcClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SorobanRpcClientService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<SorobanRpcClientService>(SorobanRpcClientService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── Construction ──────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('reads all contract IDs from config on init', () => {
    expect(service.analyticsContractId).toBe('CONTRACT_ANALYTICS');
    expect(service.tokenContractId).toBe('CONTRACT_TOKEN');
    expect(service.contractId).toBe('CONTRACT_A');
  });

  it('sets testnet network passphrase when network !== mainnet', () => {
    expect(service.networkPassphrase).toContain('Test SDF Network');
  });

  // ── getTokenBalance ───────────────────────────────────────────────────

  describe('getTokenBalance', () => {
    it('throws when TOKEN_CONTRACT_ID is not configured', async () => {
      (service as any).tokenContractId = '';
      await expect(service.getTokenBalance(TEST_PUBLIC_KEY)).rejects.toThrow(
        'TOKEN_CONTRACT_ID not configured'
      );
    });

    it('delegates to simulateContract and returns parsed balance string', async () => {
      const mockRetVal = { value: () => BigInt('1000000000') };
      const spy = jest
        .spyOn(service, 'simulateContract')
        .mockResolvedValue({ result: { retval: mockRetVal } } as any);

      const balance = await service.getTokenBalance(TEST_PUBLIC_KEY);

      expect(spy).toHaveBeenCalledWith(service.tokenContractId, 'balance', expect.any(Array));
      expect(balance).toBe('1000000000');
    });
  });

  // ── mintReward ────────────────────────────────────────────────────────

  describe('mintReward', () => {
    it('throws when TOKEN_CONTRACT_ID is not configured', async () => {
      (service as any).tokenContractId = '';
      await expect(service.mintReward(TEST_PUBLIC_KEY, 100)).rejects.toThrow(
        'TOKEN_CONTRACT_ID not configured'
      );
    });

    it('delegates to invokeContract with mint method', async () => {
      const spy = jest.spyOn(service, 'invokeContract').mockResolvedValue('mint_tx_hash');

      const result = await service.mintReward(TEST_PUBLIC_KEY, 500);

      expect(spy).toHaveBeenCalledWith(service.tokenContractId, 'mint', expect.any(Array));
      expect(result).toBe('mint_tx_hash');
    });
  });

  // ── recordProgress ────────────────────────────────────────────────────

  describe('recordProgress', () => {
    it('delegates to invokeContract with record_progress method', async () => {
      const spy = jest.spyOn(service, 'invokeContract').mockResolvedValue('progress_tx_hash');

      const result = await service.recordProgress(TEST_PUBLIC_KEY, 'course-1', 75);

      expect(spy).toHaveBeenCalledWith(
        service.analyticsContractId,
        'record_progress',
        expect.any(Array)
      );
      expect(result).toBe('progress_tx_hash');
    });
  });

  // ── Separation from Horizon ───────────────────────────────────────────

  describe('Separation of concerns (Issue #803)', () => {
    /** Strip block and single-line comments from source */
    function stripComments(src: string): string {
      return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    }

    it('does NOT import or use Horizon in code', () => {
      const raw = fs.readFileSync(path.join(__dirname, 'soroban-rpc-client.service.ts'), 'utf8');
      const code = stripComments(raw);
      expect(code).not.toMatch(/Horizon/);
    });

    it('does NOT import StellarTransactionLog', () => {
      const src = fs.readFileSync(path.join(__dirname, 'soroban-rpc-client.service.ts'), 'utf8');
      expect(src).not.toMatch(/StellarTransactionLog/);
    });

    it('does NOT inject CACHE_MANAGER', () => {
      const src = fs.readFileSync(path.join(__dirname, 'soroban-rpc-client.service.ts'), 'utf8');
      expect(src).not.toMatch(/CACHE_MANAGER/);
    });

    it('StellarService delegates Soroban calls to SorobanRpcClientService', () => {
      const src = fs.readFileSync(path.join(__dirname, 'stellar.service.ts'), 'utf8');
      expect(src).toMatch(/SorobanRpcClientService/);
      expect(src).toMatch(/sorobanRpc\./);
      // StellarService should no longer own invokeContract
      const code = stripComments(src);
      expect(code).not.toMatch(/private async invokeContract/);
    });
  });
});
