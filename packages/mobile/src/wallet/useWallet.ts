import { useState, useEffect } from 'react';
import { walletService, WalletConnection } from './walletService';

export function useWallet() {
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    walletService.restoreConnection().then(setConnection);
  }, []);

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const conn = await walletService.connect();
      setConnection(conn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    await walletService.disconnect();
    setConnection(null);
  };

  const signAndSubmit = async (xdr: string) => {
    try {
      const signedXdr = await walletService.signTransaction(xdr);
      const txHash = await walletService.submitTransaction(signedXdr);
      return txHash;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  return { connection, connecting, error, connect, disconnect, signAndSubmit };
}
