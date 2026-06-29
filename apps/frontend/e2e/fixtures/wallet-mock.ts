import { test as base, Page } from '@playwright/test';

export interface WalletMockConfig {
  publicKey?: string;
  network?: 'TESTNET' | 'PUBLIC';
  isInstalled?: boolean;
  signTransaction?: (xdr: string) => Promise<string>;
}

/**
 * Default deterministic test wallet keypair
 */
export const TEST_WALLET = {
  publicKey: 'GBQWPX7ZCWVLWZHYQAJMDJ4XYFMXRKNMZOVKN7MXGWPMZZZSZCDXWVT7',
  secretKey: 'SBZVVF23OMMMKCTC2KEZQMKHQCVHCYABKUUZMXUAXW3WKWJPCHFKVIQQ',
  network: 'TESTNET' as const,
};

/**
 * Mock Freighter wallet for deterministic E2E tests.
 * Injects a fake Freighter API into the page context before navigation.
 */
export function mockWallet(page: Page, config: WalletMockConfig = {}) {
  const {
    publicKey = TEST_WALLET.publicKey,
    network = TEST_WALLET.network,
    isInstalled = true,
    signTransaction,
  } = config;

  return page.addInitScript(
    ({ pk, net, installed }) => {
      if (!installed) {
        // Freighter not installed scenario
        (window as any).freighter = undefined;
        return;
      }

      // Mock Freighter API
      (window as any).freighter = {
        isConnected: () => Promise.resolve(true),
        
        getPublicKey: async () => {
          return pk;
        },
        
        getNetwork: async () => {
          return net;
        },
        
        getNetworkDetails: async () => {
          return {
            network: net,
            networkPassphrase:
              net === 'TESTNET'
                ? 'Test SDF Network ; September 2015'
                : 'Public Global Stellar Network ; September 2015',
          };
        },
        
        signTransaction: async (xdr: string, opts?: any) => {
          // Return a mock-signed XDR
          // In real tests, you'd use stellar-sdk to actually sign with TEST_WALLET.secretKey
          return xdr;
        },
        
        signAuthEntry: async (entryXdr: string, opts?: any) => {
          return entryXdr;
        },
        
        signBlob: async (blob: string, opts?: any) => {
          return blob;
        },
        
        // Additional methods for completeness
        isAllowed: () => Promise.resolve(true),
        setAllowed: () => Promise.resolve(),
        getUserInfo: async () => ({
          publicKey: pk,
        }),
      };

      // Also expose on window for easier debugging
      (window as any).__WALLET_MOCK__ = {
        publicKey: pk,
        network: net,
      };
    },
    { pk: publicKey, net: network, installed: isInstalled },
  );
}

/**
 * Extended test fixture that automatically mocks Freighter wallet.
 */
export const testWithWallet = base.extend<{
  walletPage: Page;
  mockWalletConfig: WalletMockConfig;
}>({
  mockWalletConfig: [
    {
      publicKey: TEST_WALLET.publicKey,
      network: 'TESTNET',
      isInstalled: true,
    },
    { option: true },
  ],

  walletPage: async ({ page, mockWalletConfig }, use) => {
    await mockWallet(page, mockWalletConfig);
    await use(page);
  },
});

export { expect } from '@playwright/test';
