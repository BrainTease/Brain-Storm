import * as Linking from 'expo-linking';
import { setSecureItem, getSecureItem, deleteSecureItem } from '../auth/secureStorage';

export interface WalletConnection {
  publicKey: string;
  provider: 'freighter' | 'walletconnect';
}

export class MobileWalletService {
  private connection: WalletConnection | null = null;

  async connect(): Promise<WalletConnection> {
    const url = Linking.createURL('stellar://connect', {
      queryParams: { 
        callback: Linking.createURL('wallet-callback'),
        network: 'testnet'
      }
    });
    
    await Linking.openURL(url);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 60000);
      
      const subscription = Linking.addEventListener('url', async ({ url }) => {
        clearTimeout(timeout);
        subscription.remove();
        
        const { queryParams } = Linking.parse(url);
        if (queryParams?.publicKey) {
          this.connection = {
            publicKey: queryParams.publicKey as string,
            provider: 'freighter'
          };
          await setSecureItem('wallet_public_key' as any, this.connection.publicKey);
          resolve(this.connection);
        } else {
          reject(new Error('Connection failed'));
        }
      });
    });
  }

  async signTransaction(xdr: string): Promise<string> {
    if (!this.connection) throw new Error('Wallet not connected');
    
    const url = Linking.createURL('stellar://sign', {
      queryParams: { 
        xdr,
        callback: Linking.createURL('sign-callback'),
        network: 'testnet'
      }
    });
    
    await Linking.openURL(url);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Sign timeout')), 60000);
      
      const subscription = Linking.addEventListener('url', ({ url }) => {
        clearTimeout(timeout);
        subscription.remove();
        
        const { queryParams } = Linking.parse(url);
        if (queryParams?.signedXdr) {
          resolve(queryParams.signedXdr as string);
        } else {
          reject(new Error('Signing failed'));
        }
      });
    });
  }

  async submitTransaction(signedXdr: string): Promise<string> {
    // Submit to Stellar network via backend or directly
    const response = await fetch('https://horizon-testnet.stellar.org/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `tx=${encodeURIComponent(signedXdr)}`
    });
    
    if (!response.ok) throw new Error('Transaction failed');
    
    const result = await response.json();
    return result.hash;
  }

  async disconnect() {
    this.connection = null;
    await deleteSecureItem('wallet_public_key' as any);
  }

  getConnection(): WalletConnection | null {
    return this.connection;
  }

  async restoreConnection(): Promise<WalletConnection | null> {
    const publicKey = await getSecureItem('wallet_public_key' as any);
    if (publicKey) {
      this.connection = { publicKey, provider: 'freighter' };
      return this.connection;
    }
    return null;
  }
}

export const walletService = new MobileWalletService();
