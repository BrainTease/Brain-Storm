import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  SUPPORTED_WALLETS,
  WALLET_ADAPTERS,
  getWalletAdapter,
  albedoAdapter,
  xbullAdapter,
  walletConnectAdapter,
  truncateAddress,
  type WalletType,
} from '@/lib/wallet';

afterEach(() => {
  delete (window as { albedo?: unknown }).albedo;
  delete (window as { xBull?: unknown }).xBull;
  vi.restoreAllMocks();
});

describe('wallet adapter registry', () => {
  it('exposes every wallet type exactly once', () => {
    const ids = SUPPORTED_WALLETS.map((w) => w.id);
    expect(ids).toEqual(['freighter', 'albedo', 'xbull', 'walletconnect']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves an adapter by id', () => {
    expect(getWalletAdapter('albedo')).toBe(albedoAdapter);
  });

  it('throws a coded error for an unknown wallet', () => {
    expect(() => getWalletAdapter('metamask' as WalletType)).toThrowError(/not supported/i);
  });

  it('gives every adapter the metadata the picker renders', () => {
    for (const adapter of Object.values(WALLET_ADAPTERS)) {
      expect(adapter.name).toBeTruthy();
      expect(adapter.description).toBeTruthy();
      expect(adapter.installUrl).toMatch(/^https:\/\//);
      expect(adapter.helpUrl).toMatch(/^https:\/\//);
      expect(typeof adapter.isInstalled).toBe('function');
    }
  });

  it('marks WalletConnect as not yet usable', () => {
    expect(walletConnectAdapter.enabled).toBe(false);
    expect(walletConnectAdapter.isInstalled()).toBe(false);
  });
});

describe('albedo adapter', () => {
  it('reports installed only when the extension injected itself', () => {
    expect(albedoAdapter.isInstalled()).toBe(false);
    (window as { albedo?: unknown }).albedo = {};
    expect(albedoAdapter.isInstalled()).toBe(true);
  });

  it('connects and returns the network passphrase', async () => {
    (window as { albedo?: unknown }).albedo = {
      publicKey: vi.fn(() => Promise.resolve({ pubkey: 'GALBEDO' })),
    };
    await expect(albedoAdapter.connect()).resolves.toEqual({
      publicKey: 'GALBEDO',
      network: 'Test SDF Network ; September 2015',
    });
  });

  it('throws NOT_INSTALLED when the extension is absent', async () => {
    await expect(albedoAdapter.connect()).rejects.toMatchObject({ code: 'NOT_INSTALLED' });
  });

  it('signs via the extension', async () => {
    const tx = vi.fn(() => Promise.resolve({ signed_envelope_xdr: 'SIGNED' }));
    (window as { albedo?: unknown }).albedo = { tx };
    await expect(albedoAdapter.sign('XDR')).resolves.toBe('SIGNED');
    expect(tx).toHaveBeenCalledWith({ xdr: 'XDR', network: 'Test SDF Network ; September 2015' });
  });
});

describe('xbull adapter', () => {
  it('connects through the injected provider', async () => {
    (window as { xBull?: unknown }).xBull = {
      connect: vi.fn(() => Promise.resolve({ publicKey: 'GXBULL' })),
    };
    await expect(xbullAdapter.connect()).resolves.toMatchObject({ publicKey: 'GXBULL' });
  });

  it('throws NOT_INSTALLED when the extension is absent', async () => {
    await expect(xbullAdapter.sign('XDR')).rejects.toMatchObject({ code: 'NOT_INSTALLED' });
  });
});

describe('truncateAddress', () => {
  it('keeps the first and last four characters', () => {
    expect(truncateAddress('GPUBKEYABCDEF')).toBe('GPUB…CDEF');
  });

  it('leaves short values untouched', () => {
    expect(truncateAddress('GABC')).toBe('GABC');
  });
});
