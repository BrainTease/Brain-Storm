import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecretsAccessor } from './secrets.accessor';

describe('SecretsAccessor', () => {
  let accessor: SecretsAccessor;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = { get: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecretsAccessor, { provide: ConfigService, useValue: configService }],
    }).compile();
    accessor = module.get(SecretsAccessor);
  });

  it('returns the value from ConfigService for get()', () => {
    configService.get.mockReturnValue('super-secret');
    expect(accessor.get('DATABASE_REPLICA_HOST')).toBe('super-secret');
    expect(configService.get).toHaveBeenCalledWith('DATABASE_REPLICA_HOST');
  });

  it('returns undefined when the secret is not set', () => {
    configService.get.mockReturnValue(undefined);
    expect(accessor.get('MISSING_SECRET')).toBeUndefined();
  });

  it('getOrThrow returns the value when present', () => {
    configService.get.mockReturnValue('value');
    expect(accessor.getOrThrow('SOME_SECRET')).toBe('value');
  });

  it('getOrThrow throws when the secret is missing', () => {
    configService.get.mockReturnValue(undefined);
    expect(() => accessor.getOrThrow('SOME_SECRET')).toThrow('Missing required secret: SOME_SECRET');
  });

  it('getOrThrow throws when the secret is an empty string', () => {
    configService.get.mockReturnValue('');
    expect(() => accessor.getOrThrow('SOME_SECRET')).toThrow('Missing required secret: SOME_SECRET');
  });

  it('getBoolean parses "true" as true and defaults otherwise', () => {
    configService.get.mockReturnValue('true');
    expect(accessor.getBoolean('FEATURE_X')).toBe(true);

    configService.get.mockReturnValue('false');
    expect(accessor.getBoolean('FEATURE_X')).toBe(false);

    configService.get.mockReturnValue(undefined);
    expect(accessor.getBoolean('FEATURE_X', true)).toBe(true);
  });
});
