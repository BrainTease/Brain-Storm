/**
 * Issue #1279 & #1355: Freighter detection lives in a typed hook, not in UI components.
 * Issue #1355: Mock Freighter wallet API for frontend tests
 *
 * Comprehensive Freighter API mocks covering:
 * - Connection detection (connected/disconnected)
 * - Public key retrieval with error handling
 * - Message signing with proper request format
 * - Network compatibility checks
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

const freighterMock = vi.hoisted(() => ({
  isConnected: vi.fn(),
  getPublicKey: vi.fn(),
  signMessage: vi.fn(),
  signTransaction: vi.fn(),
  submitTransaction: vi.fn(),
  getNetwork: vi.fn(),
}));

vi.mock('@stellar/freighter-api', () => freighterMock);

// The hook is a memoised factory; run it without a React renderer.
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: (factory: () => unknown) => factory(),
}));

import { useFreighterDetection } from '@/hooks/useFreighterDetection';

describe('Freighter API Mocking — Issue #1355', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Detection', () => {
    it('mocks isConnected when Freighter is available', async () => {
      freighterMock.isConnected.mockResolvedValue({ isConnected: true });
      const api = useFreighterDetection();
      await expect(api.detectFreighter()).resolves.toEqual({ status: 'available' });
      expect(freighterMock.isConnected).toHaveBeenCalled();
    });

    it('mocks isConnected when Freighter is not installed', async () => {
      freighterMock.isConnected.mockResolvedValue({ isConnected: false });
      const api = useFreighterDetection();
      await expect(api.detectFreighter()).resolves.toEqual({ status: 'missing' });
    });

    it('handles network errors during connection check', async () => {
      freighterMock.isConnected.mockRejectedValue(new Error('Network error'));
      const api = useFreighterDetection();
      await expect(api.detectFreighter()).resolves.toEqual({ status: 'missing' });
    });
  });

  describe('Public Key Retrieval', () => {
    it('mocks getPublicKey for valid Freighter account', async () => {
      freighterMock.getPublicKey.mockResolvedValue({ publicKey: 'GABC123' });
      const api = useFreighterDetection();
      const pk = await api.getPublicKey();
      expect(pk).toBe('GABC123');
      expect(freighterMock.getPublicKey).toHaveBeenCalled();
    });

    it('handles locked wallet in mock', async () => {
      freighterMock.getPublicKey.mockResolvedValue({ publicKey: '', error: 'locked' });
      const api = useFreighterDetection();
      await expect(api.getPublicKey()).rejects.toThrow('locked');
    });

    it('handles user rejection in mock', async () => {
      freighterMock.getPublicKey.mockResolvedValue({
        publicKey: '',
        error: 'User rejected the request',
      });
      const api = useFreighterDetection();
      await expect(api.getPublicKey()).rejects.toThrow('User rejected the request');
    });

    it('handles missing extension in mock', async () => {
      freighterMock.getPublicKey.mockRejectedValue(new Error('Extension not found'));
      const api = useFreighterDetection();
      await expect(api.getPublicKey()).rejects.toThrow('Extension not found');
    });
  });

  describe('Message Signing', () => {
    it('mocks signMessage with proper request format', async () => {
      freighterMock.signMessage.mockResolvedValue({ signedMessage: 'sig_abc123' });
      const api = useFreighterDetection();
      const sig = await api.signMessage('challenge_text', 'GABC123');
      expect(sig).toBe('sig_abc123');
      expect(freighterMock.signMessage).toHaveBeenCalledWith('challenge_text', { address: 'GABC123' });
    });

    it('handles signing rejection in mock', async () => {
      freighterMock.signMessage.mockResolvedValue({
        signedMessage: '',
        error: 'User rejected signing',
      });
      const api = useFreighterDetection();
      // Note: Current implementation doesn't error on signMessage errors, adjust if needed
      const sig = await api.signMessage('challenge', 'GABC123');
      expect(sig).toBe('');
    });

    it('passes address correctly in mock request', async () => {
      freighterMock.signMessage.mockResolvedValue({ signedMessage: 'sig' });
      const api = useFreighterDetection();
      await api.signMessage('msg', 'GXYZ789');
      expect(freighterMock.signMessage).toHaveBeenCalledWith('msg', { address: 'GXYZ789' });
    });
  });

  describe('Mock Extension Detection', () => {
    it('mocks extension availability check', async () => {
      freighterMock.isConnected.mockImplementation(async () => {
        // Simulate extension available in mock
        return { isConnected: true };
      });
      const api = useFreighterDetection();
      await expect(api.detectFreighter()).resolves.toEqual({ status: 'available' });
    });

    it('mocks extension missing scenario', async () => {
      freighterMock.isConnected.mockImplementation(async () => {
        throw new Error('Extension not installed');
      });
      const api = useFreighterDetection();
      await expect(api.detectFreighter()).resolves.toEqual({ status: 'missing' });
    });
  });
});

describe('Wallet UI stays presentational - Issue #1279', () => {
  const profileFiles = [
    path.resolve(__dirname, '../../app/profile/WalletSection.tsx'),
    path.resolve(__dirname, '../../app/[locale]/profile/WalletSection.tsx'),
  ];

  it.each(profileFiles)('%s does not import the Freighter SDK directly', (file) => {
    const content = fs.readFileSync(file, 'utf-8');

    expect(content).not.toMatch(/@stellar\/freighter-api/);
    expect(content).toMatch(/useFreighterDetection/);
  });
});
