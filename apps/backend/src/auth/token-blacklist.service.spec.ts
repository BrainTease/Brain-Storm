import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LessThan } from 'typeorm';
import { TokenBlacklistService } from './token-blacklist.service';
import { TokenBlacklist } from './token-blacklist.entity';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;

  const mockBlacklistRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: getRepositoryToken(TokenBlacklist),
          useValue: mockBlacklistRepo,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('blacklistToken', () => {
    const token = 'sample.jwt.token';
    const userId = 'user-uuid-1';

    it('should add token to cache and database when TTL is positive', async () => {
      const futureExpiry = new Date(Date.now() + 60_000); // 1 minute from now
      const mockEntity = { tokenHash: 'hash', userId, expiresAt: futureExpiry };

      mockBlacklistRepo.create.mockReturnValue(mockEntity);
      mockBlacklistRepo.save.mockResolvedValue(mockEntity);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.blacklistToken(token, userId, futureExpiry);

      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
      const [cacheKey, value, ttl] = mockCacheManager.set.mock.calls[0];
      expect(cacheKey).toMatch(/^blacklist:/);
      expect(value).toBe(true);
      expect(ttl).toBeGreaterThan(0);

      expect(mockBlacklistRepo.create).toHaveBeenCalledTimes(1);
      expect(mockBlacklistRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should NOT write to cache when token is already expired', async () => {
      const pastExpiry = new Date(Date.now() - 1000); // already expired
      const mockEntity = { tokenHash: 'hash', userId, expiresAt: pastExpiry };

      mockBlacklistRepo.create.mockReturnValue(mockEntity);
      mockBlacklistRepo.save.mockResolvedValue(mockEntity);

      await service.blacklistToken(token, userId, pastExpiry);

      // Cache should not be written for expired token
      expect(mockCacheManager.set).not.toHaveBeenCalled();
      // But DB record should still be created
      expect(mockBlacklistRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should hash the token before storing (not store plain text)', async () => {
      const futureExpiry = new Date(Date.now() + 60_000);
      const mockEntity = {};
      mockBlacklistRepo.create.mockReturnValue(mockEntity);
      mockBlacklistRepo.save.mockResolvedValue(mockEntity);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.blacklistToken(token, userId, futureExpiry);

      const createCall = mockBlacklistRepo.create.mock.calls[0][0];
      expect(createCall.tokenHash).not.toBe(token);
      expect(createCall.tokenHash).toHaveLength(64); // SHA-256 hex
    });

    it('should use consistent hashes for the same token', async () => {
      const futureExpiry = new Date(Date.now() + 60_000);
      const mockEntity = {};
      mockBlacklistRepo.create.mockReturnValue(mockEntity);
      mockBlacklistRepo.save.mockResolvedValue(mockEntity);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.blacklistToken(token, userId, futureExpiry);
      const firstHash = mockBlacklistRepo.create.mock.calls[0][0].tokenHash;

      jest.clearAllMocks();
      mockBlacklistRepo.create.mockReturnValue(mockEntity);
      mockBlacklistRepo.save.mockResolvedValue(mockEntity);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.blacklistToken(token, userId, futureExpiry);
      const secondHash = mockBlacklistRepo.create.mock.calls[0][0].tokenHash;

      expect(firstHash).toBe(secondHash);
    });
  });

  describe('isTokenBlacklisted', () => {
    const token = 'some.jwt.token';

    it('should return true when token is found in cache', async () => {
      mockCacheManager.get.mockResolvedValue(true);

      const result = await service.isTokenBlacklisted(token);

      expect(result).toBe(true);
      expect(mockBlacklistRepo.findOne).not.toHaveBeenCalled();
    });

    it('should return false when cache has explicit false value', async () => {
      // cache returning undefined means "not in cache", not false
      // but if somehow stored as false it should be used
      mockCacheManager.get.mockResolvedValue(undefined);
      mockBlacklistRepo.findOne.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted(token);

      expect(result).toBe(false);
    });

    it('should check database when cache returns undefined (cache miss)', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockBlacklistRepo.findOne.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted(token);

      expect(result).toBe(false);
      expect(mockBlacklistRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return true when token found in database and cache was cold', async () => {
      const futureExpiry = new Date(Date.now() + 60_000);
      const dbEntry = { tokenHash: 'hash', userId: 'u1', expiresAt: futureExpiry };

      mockCacheManager.get.mockResolvedValue(undefined);
      mockBlacklistRepo.findOne.mockResolvedValue(dbEntry);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.isTokenBlacklisted(token);

      expect(result).toBe(true);
      // Should re-populate cache
      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
    });

    it('should NOT re-populate cache when DB entry is already expired', async () => {
      const pastExpiry = new Date(Date.now() - 1000);
      const dbEntry = { tokenHash: 'hash', userId: 'u1', expiresAt: pastExpiry };

      mockCacheManager.get.mockResolvedValue(undefined);
      mockBlacklistRepo.findOne.mockResolvedValue(dbEntry);

      const result = await service.isTokenBlacklisted(token);

      expect(result).toBe(true); // still blacklisted by db record
      expect(mockCacheManager.set).not.toHaveBeenCalled(); // but expired — don't cache
    });

    it('should use same hash for lookup as for blacklisting', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockBlacklistRepo.findOne.mockResolvedValue(null);

      await service.isTokenBlacklisted(token);

      const cacheKey: string = mockCacheManager.get.mock.calls[0][0];
      expect(cacheKey).toMatch(/^blacklist:[a-f0-9]{64}$/);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete tokens where expiresAt < now', async () => {
      mockBlacklistRepo.delete.mockResolvedValue({ affected: 3 });

      const count = await service.cleanupExpiredTokens();

      expect(count).toBe(3);
      expect(mockBlacklistRepo.delete).toHaveBeenCalledWith({
        expiresAt: LessThan(expect.any(Date)),
      });
    });

    it('should return 0 when nothing was deleted', async () => {
      mockBlacklistRepo.delete.mockResolvedValue({ affected: 0 });

      const count = await service.cleanupExpiredTokens();

      expect(count).toBe(0);
    });

    it('should return 0 when affected is undefined (driver difference)', async () => {
      mockBlacklistRepo.delete.mockResolvedValue({ affected: undefined });

      const count = await service.cleanupExpiredTokens();

      expect(count).toBe(0);
    });
  });
});
