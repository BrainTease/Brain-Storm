import { Injectable } from '@nestjs/common';
import { Horizon, Keypair, Networks, SorobanRpc } from '@stellar/stellar-sdk';

/**
 * The one injectable entry point to the Stellar SDK for client construction. Services take this
 * instead of importing the SDK, so tests can replace it with a mock and no test needs the network.
 */
@Injectable()
export class StellarSdkService {
  readonly networks = Networks;

  createHorizonServer(url: string): Horizon.Server {
    return new Horizon.Server(url);
  }

  createSorobanServer(url: string): SorobanRpc.Server {
    return new SorobanRpc.Server(url);
  }

  keypairFromSecret(secret: string): Keypair {
    return Keypair.fromSecret(secret);
  }
}
