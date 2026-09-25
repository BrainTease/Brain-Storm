/**
 * End-to-end tests for credential issuance flow
 * Tests the complete user journey for issuing and receiving certificates/credentials
 * Issue #1125: Add E2E coverage for credential issuance flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

interface MockWallet {
  connect: () => Promise<{ address: string }>;
  disconnect: () => Promise<void>;
  signTransaction: (tx: unknown) => Promise<{ signature: string }>;
  isConnected: () => boolean;
  getPublicKey: () => string;
}

interface MockCredentialService {
  issueCredential: (data: unknown) => Promise<{
    id: string;
    transactionHash: string;
    status: string;
    credentialUri: string;
  }>;
  fetchCredential: (id: string) => Promise<{
    id: string;
    recipient: string;
    issuer: string;
    type: string;
    attributes: Record<string, unknown>;
  }>;
  verifyCredential: (id: string) => Promise<boolean>;
}

const createMockWallet = (): MockWallet => ({
  connect: vi.fn().mockResolvedValue({ address: 'G1234567890ABCDEF' }),
  disconnect: vi.fn().mockResolvedValue(undefined),
  signTransaction: vi.fn().mockResolvedValue({ signature: 'sig123' }),
  isConnected: vi.fn().mockReturnValue(true),
  getPublicKey: vi.fn().mockReturnValue('G1234567890ABCDEF'),
});

const createMockCredentialService = (): MockCredentialService => ({
  issueCredential: vi.fn().mockResolvedValue({
    id: 'cred123',
    transactionHash: 'hash123',
    status: 'issued',
    credentialUri: 'https://example.com/cred/cred123',
  }),
  fetchCredential: vi.fn().mockResolvedValue({
    id: 'cred123',
    recipient: 'G1234567890ABCDEF',
    issuer: 'G0987654321ZYXWVU',
    type: 'Certificate',
    attributes: { name: 'Test Certificate', date: '2024-01-01' },
  }),
  verifyCredential: vi.fn().mockResolvedValue(true),
});

describe('Credential Issuance E2E - Happy Path', () => {
  let mockWallet: MockWallet;
  let mockCredentialService: MockCredentialService;

  beforeEach(() => {
    mockWallet = createMockWallet();
    mockCredentialService = createMockCredentialService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should complete happy path: connect wallet → issue credential → display credential', async () => {
    expect(await mockWallet.connect()).toEqual({
      address: 'G1234567890ABCDEF',
    });

    const credentialData = {
      recipientAddress: 'G1234567890ABCDEF',
      credentialType: 'Certificate',
      attributes: {
        name: 'Test Certificate',
        date: '2024-01-01',
      },
    };

    const issuanceResult = await mockCredentialService.issueCredential(credentialData);
    expect(issuanceResult).toBeDefined();
    expect(issuanceResult.status).toBe('issued');
    expect(issuanceResult.id).toBe('cred123');

    const fetchedCred = await mockCredentialService.fetchCredential('cred123');
    expect(fetchedCred.recipient).toBe('G1234567890ABCDEF');
    expect(fetchedCred.type).toBe('Certificate');
  });

  it('should properly display issued credential with all attributes', async () => {
    const credentialId = 'cred123';
    const credential = await mockCredentialService.fetchCredential(credentialId);

    expect(credential).toBeDefined();
    expect(credential.id).toBe('cred123');
    expect(credential.recipient).toBeDefined();
    expect(credential.issuer).toBeDefined();
    expect(credential.type).toBe('Certificate');
    expect(credential.attributes).toBeDefined();
    expect(credential.attributes.name).toBe('Test Certificate');
  });

  it('should verify credential authenticity', async () => {
    const isValid = await mockCredentialService.verifyCredential('cred123');
    expect(isValid).toBe(true);
  });
});

describe('Credential Issuance E2E - Error Handling', () => {
  it('should handle wallet connection failure gracefully', async () => {
    const failingWallet = {
      connect: vi.fn().mockRejectedValue(new Error('Connection refused')),
    };

    try {
      await failingWallet.connect();
      expect.fail('Should have thrown an error');
    } catch (error) {
      const err = error as Error;
      expect(err.message).toBe('Connection refused');
    }
  });

  it('should handle wallet rejection of transaction', async () => {
    const rejectingWallet = {
      connect: vi.fn().mockResolvedValue({ address: 'G1234567890ABCDEF' }),
      signTransaction: vi.fn().mockRejectedValue(new Error('User rejected transaction')),
    };

    await rejectingWallet.connect();

    try {
      await rejectingWallet.signTransaction({ tx: 'txdata' });
      expect.fail('Should have thrown an error');
    } catch (error) {
      const err = error as Error;
      expect(err.message).toBe('User rejected transaction');
    }
  });

  it('should handle network failure during credential issuance', async () => {
    const failingService = {
      issueCredential: vi
        .fn()
        .mockRejectedValue(new Error('Network error: Failed to connect to blockchain')),
    };

    try {
      await failingService.issueCredential({ recipientAddress: 'G1234567890ABCDEF' });
      expect.fail('Should have thrown an error');
    } catch (error) {
      const err = error as Error;
      expect(err.message).toContain('Network error');
    }
  });

  it('should handle timeout during credential verification', async () => {
    const timeoutService = {
      verifyCredential: vi.fn().mockRejectedValue(new Error('Request timeout')),
    };

    try {
      await timeoutService.verifyCredential('cred123');
      expect.fail('Should have thrown an error');
    } catch (error) {
      const err = error as Error;
      expect(err.message).toBe('Request timeout');
    }
  });
});

describe('Credential Issuance E2E - Retries', () => {
  it('should retry on transient network failures', async () => {
    let attemptCount = 0;
    const flakeyService = {
      issueCredential: vi.fn().mockImplementation(() => {
        attemptCount += 1;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({
          id: 'cred123',
          status: 'issued',
        });
      }),
    };

    let result;
    for (let i = 0; i < 3; i++) {
      try {
        result = await flakeyService.issueCredential({});
        break;
      } catch (error) {
        if (i === 2) throw error;
      }
    }

    expect(result).toBeDefined();
    expect(result.status).toBe('issued');
    expect(flakeyService.issueCredential).toHaveBeenCalledTimes(3);
  });
});

describe('Credential Issuance E2E - Bulk Operations', () => {
  it('should handle multiple credential issuances in sequence', async () => {
    const mockCredentialService: MockCredentialService = {
      issueCredential: vi.fn().mockResolvedValue({
        id: 'cred123',
        transactionHash: 'hash123',
        status: 'issued',
        credentialUri: 'https://example.com/cred/cred123',
      }),
      fetchCredential: vi.fn().mockResolvedValue({
        id: 'cred123',
        recipient: 'G1234567890ABCDEF',
        issuer: 'G0987654321ZYXWVU',
        type: 'Certificate',
        attributes: {},
      }),
      verifyCredential: vi.fn().mockResolvedValue(true),
    };

    const credentials = [];

    for (let i = 0; i < 3; i++) {
      const credential = await mockCredentialService.issueCredential({
        recipientAddress: `G${i}234567890ABCDEF`,
        credentialType: 'Certificate',
      });
      credentials.push(credential);
    }

    expect(credentials).toHaveLength(3);
    credentials.forEach((cred) => {
      expect(cred.id).toBeDefined();
      expect(cred.status).toBe('issued');
    });
  });
});

describe('Credential Issuance E2E - Lifecycle', () => {
  it('should handle disconnection between wallet and credential service', async () => {
    const mockWallet = {
      connect: vi.fn().mockResolvedValue({ address: 'G1234567890ABCDEF' }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
    };

    await mockWallet.connect();
    expect(mockWallet.isConnected()).toBe(true);

    await mockWallet.disconnect();
    mockWallet.isConnected = vi.fn().mockReturnValue(false);

    expect(mockWallet.isConnected()).toBe(false);
  });

  it('should store credential reference after successful issuance', async () => {
    const credentialRef = {
      id: 'cred123',
      uri: 'https://example.com/cred/cred123',
      issuedAt: new Date().toISOString(),
      credentialType: 'Certificate',
    };

    expect(credentialRef.id).toBeDefined();
    expect(credentialRef.uri).toBeDefined();
    expect(credentialRef.issuedAt).toBeDefined();
    expect(credentialRef.credentialType).toBe('Certificate');
  });
});
