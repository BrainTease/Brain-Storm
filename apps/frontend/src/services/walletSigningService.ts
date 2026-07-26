import { signWithFreighter, getFreighterNetwork } from '@/lib/walletApi';
import { signWithAlbedo, signWithXbull } from '@/lib/walletAdapters';
import type { WalletType } from '@/store/walletStore';

export interface SigningResult {
  signedXdr: string;
}

export interface SigningError {
  code: string;
  message: string;
}

export async function signTransaction(
  xdr: string,
  walletType: WalletType
): Promise<SigningResult> {
  if (!walletType) {
    throw {
      code: 'NO_WALLET_CONNECTED',
      message: 'No wallet connected.',
    } as SigningError;
  }

  try {
    let signedXdr: string;

    if (walletType === 'freighter') {
      const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'MAINNET' : 'TESTNET';
      signedXdr = await signWithFreighter(xdr, network);
    } else if (walletType === 'albedo') {
      signedXdr = await signWithAlbedo(xdr);
    } else if (walletType === 'xbull') {
      signedXdr = await signWithXbull(xdr);
    } else {
      throw {
        code: 'UNSUPPORTED_WALLET',
        message: `Wallet type "${walletType}" is not supported for signing.`,
      } as SigningError;
    }

    return { signedXdr };
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      throw err;
    }
    throw {
      code: 'SIGNING_FAILED',
      message: err instanceof Error ? err.message : 'Failed to sign transaction.',
    } as SigningError;
  }
}

export async function getNetworkForWallet(walletType: WalletType): Promise<string> {
  if (walletType === 'freighter') {
    return getFreighterNetwork();
  }
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
  return network === 'mainnet'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';
}
