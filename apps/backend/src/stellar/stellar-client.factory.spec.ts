import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarClientFactory } from './stellar-client.factory';
import { Horizon, SorobanRpc } from '@stellar/stellar-sdk';

describe('StellarClientFactory', () => {
  let factory: StellarClientFactory;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'stellar.network': 'testnet',
          'stellar.sorobanRpcUrl': 'https://soroban-testnet.stellar.org',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarClientFactory,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    factory = module.get<StellarClientFactory>(StellarClientFactory);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('Singleton Pattern - Horizon', () => {
    it('should return the same Horizon instance on multiple calls', () => {
      const client1 = factory.getHorizonClient();
      const client2 = factory.getHorizonClient();
      const client3 = factory.getHorizonClient();

      expect(client1).toBe(client2);
      expect(client2).toBe(client3);
      expect(client1 instanceof Horizon.Server).toBe(true);
    });

    it('should only create one Horizon client', () => {
      // First call
      const client1 = factory.getHorizonClient();
      expect(client1).toBeDefined();

      // Verify it's the same instance
      const client2 = factory.getHorizonClient();
      expect(client2).toBe(client1);
    });
  });

  describe('Singleton Pattern - Soroban RPC', () => {
    it('should return the same Soroban RPC instance on multiple calls', () => {
      const client1 = factory.getSorobanClient();
      const client2 = factory.getSorobanClient();
      const client3 = factory.getSorobanClient();

      expect(client1).toBe(client2);
      expect(client2).toBe(client3);
      expect(client1 instanceof SorobanRpc.Server).toBe(true);
    });

    it('should only create one Soroban RPC client', () => {
      // First call
      const client1 = factory.getSorobanClient();
      expect(client1).toBeDefined();

      // Verify it's the same instance
      const client2 = factory.getSorobanClient();
      expect(client2).toBe(client1);
    });

    it('should throw error if sorobanRpcUrl not configured', () => {
      // Create factory without sorobanRpcUrl
      const mockConfig = {
        get: jest.fn((key: string) => {
          const config: Record<string, string | undefined> = {
            'stellar.network': 'testnet',
            'stellar.sorobanRpcUrl': undefined,
          };
          return config[key];
        }),
      };

      const factoryWithoutUrl = new StellarClientFactory(mockConfig as any);

      expect(() => factoryWithoutUrl.getSorobanClient()).toThrow(
        'stellar.sorobanRpcUrl not configured'
      );
    });
  });

  describe('Network Configuration', () => {
    it('should detect testnet network correctly', () => {
      expect(factory.isTestnetNetwork()).toBe(true);
    });

    it('should return TESTNET passphrase for testnet', () => {
      expect(factory.getNetworkPassphrase()).toBe('Test SDF Network ; September 2015');
    });

    it('should detect mainnet network correctly', () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, string> = {
            'stellar.network': 'mainnet',
            'stellar.sorobanRpcUrl': 'https://soroban.stellar.org',
          };
          return config[key];
        }),
      };

      const mainnetFactory = new StellarClientFactory(mockConfigService as any);
      expect(mainnetFactory.isTestnetNetwork()).toBe(false);
    });

    it('should return PUBLIC passphrase for mainnet', () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, string> = {
            'stellar.network': 'mainnet',
            'stellar.sorobanRpcUrl': 'https://soroban.stellar.org',
          };
          return config[key];
        }),
      };

      const mainnetFactory = new StellarClientFactory(mockConfigService as any);
      expect(mainnetFactory.getNetworkPassphrase()).toBe('Public Global Stellar Network ; September 2015');
    });
  });

  describe('Client Reset', () => {
    it('should reset clients and create new instances', () => {
      const client1 = factory.getHorizonClient();
      const soroban1 = factory.getSorobanClient();

      factory.resetClients();

      const client2 = factory.getHorizonClient();
      const soroban2 = factory.getSorobanClient();

      // Verify new instances were created
      expect(client1).not.toBe(client2);
      expect(soroban1).not.toBe(soroban2);
    });

    it('should create new instances after reset', () => {
      // First set of instances
      factory.getHorizonClient();
      factory.getSorobanClient();

      // Reset
      factory.resetClients();

      // New instances
      const newHorizon = factory.getHorizonClient();
      const newSoroban = factory.getSorobanClient();

      // Verify they're singleton again
      expect(newHorizon).toBe(factory.getHorizonClient());
      expect(newSoroban).toBe(factory.getSorobanClient());
    });
  });

  describe('Independent Client Instances', () => {
    it('should maintain separate Horizon and Soroban instances', () => {
      const horizonClient = factory.getHorizonClient();
      const sorobanClient = factory.getSorobanClient();

      expect(horizonClient).not.toBe(sorobanClient);
      expect(horizonClient instanceof Horizon.Server).toBe(true);
      expect(sorobanClient instanceof SorobanRpc.Server).toBe(true);
    });
  });
});
