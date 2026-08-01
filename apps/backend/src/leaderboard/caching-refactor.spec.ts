/**
 * Caching Refactor Tests – Issue #817
 *
 * Verifies that:
 * 1. LeaderboardService no longer injects CACHE_MANAGER directly.
 * 2. CoursesService no longer injects CACHE_MANAGER directly.
 * 3. Both services delegate caching to CacheService.getOrSet.
 * 4. CoursesService.invalidateCache uses CacheService.invalidatePrefix + del.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeaderboardService } from './leaderboard.service';
import { User } from '../users/user.entity';
import { StellarService } from '../stellar/stellar.service';
import { CacheService } from '../cache/cache.service';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockCacheService = {
  getOrSet: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  invalidatePrefix: jest.fn(),
};

const mockStellarService = {
  getTokenBalance: jest.fn(),
};

const mockUserRepo = {
  find: jest.fn(),
};

// ── LeaderboardService – DI tests ─────────────────────────────────────────

describe('LeaderboardService (Issue #817)', () => {
  let service: LeaderboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: StellarService, useValue: mockStellarService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getTopUsers delegates to cacheService.getOrSet', async () => {
    const fakeLeaderboard = [{ userId: 'u1', balance: '100' }];
    mockCacheService.getOrSet.mockResolvedValue(fakeLeaderboard);

    const result = await service.getTopUsers();

    expect(mockCacheService.getOrSet).toHaveBeenCalledWith(
      'leaderboard:top50',
      expect.any(Function),
      300
    );
    expect(result).toBe(fakeLeaderboard);
  });

  it('factory fn fetches users and ranks by balance descending', async () => {
    const users = [
      { id: 'u1', email: 'a@a.com', stellarPublicKey: 'GA1', username: null, deletedAt: null },
      { id: 'u2', email: 'b@b.com', stellarPublicKey: 'GB2', username: 'Bob', deletedAt: null },
    ];
    mockUserRepo.find.mockResolvedValue(users);
    mockStellarService.getTokenBalance.mockResolvedValueOnce('50').mockResolvedValueOnce('200');

    // Invoke the real factory by calling getOrSet's impl
    mockCacheService.getOrSet.mockImplementation((_key: string, factory: () => Promise<any>) =>
      factory()
    );

    const result = await service.getTopUsers();

    expect(result[0].userId).toBe('u2'); // higher balance first
    expect(result[0].balance).toBe('200');
    expect(result[1].userId).toBe('u1');
  });
});

// ── Source-level assertions ───────────────────────────────────────────────

describe('Caching refactor – source-level checks (Issue #817)', () => {
  const SRC = path.resolve(__dirname, '..');

  /** Strip single-line and block comments from a TypeScript source string */
  function stripComments(src: string): string {
    // Remove block comments /* ... */
    let stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove single-line comments // ...
    stripped = stripped.replace(/\/\/[^\n]*/g, '');
    return stripped;
  }

  it('LeaderboardService does NOT inject CACHE_MANAGER in code', () => {
    const raw = fs.readFileSync(path.join(SRC, 'leaderboard/leaderboard.service.ts'), 'utf8');
    const code = stripComments(raw);
    expect(code).not.toMatch(/CACHE_MANAGER/);
  });

  it('LeaderboardService uses CacheService', () => {
    const src = fs.readFileSync(path.join(SRC, 'leaderboard/leaderboard.service.ts'), 'utf8');
    expect(src).toMatch(/CacheService/);
    expect(src).toMatch(/cacheService\.getOrSet/);
  });

  it('CoursesService does NOT inject CACHE_MANAGER in code', () => {
    const raw = fs.readFileSync(path.join(SRC, 'courses/courses.service.ts'), 'utf8');
    const code = stripComments(raw);
    expect(code).not.toMatch(/CACHE_MANAGER/);
  });

  it('CoursesService uses CacheService.getOrSet', () => {
    const src = fs.readFileSync(path.join(SRC, 'courses/courses.service.ts'), 'utf8');
    expect(src).toMatch(/cacheService\.getOrSet/);
  });

  it('CoursesService does NOT call cacheManager.wrap in code', () => {
    const raw = fs.readFileSync(path.join(SRC, 'courses/courses.service.ts'), 'utf8');
    const code = stripComments(raw);
    expect(code).not.toMatch(/cacheManager\.wrap/);
  });

  it('CoursesService uses CacheService.invalidatePrefix and has no deleteCacheKeys method', () => {
    const raw = fs.readFileSync(path.join(SRC, 'courses/courses.service.ts'), 'utf8');
    const code = stripComments(raw);
    expect(code).toMatch(/cacheService\.invalidatePrefix/);
    expect(code).not.toMatch(/deleteCacheKeys/);
  });
});
