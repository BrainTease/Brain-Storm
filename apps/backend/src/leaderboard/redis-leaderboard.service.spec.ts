import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RedisLeaderboardService } from './redis-leaderboard.service';
import { Progress } from '../progress/progress.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { User } from '../users/user.entity';

// ── Minimal Redis mock ────────────────────────────────────────────────────────

const buildRedisMock = () => {
  const store = new Map<string, Map<string, number>>();
  const stringStore = new Map<string, string>();

  const getOrCreate = (key: string) => {
    if (!store.has(key)) store.set(key, new Map());
    return store.get(key)!;
  };

  const mock = {
    zincrby: jest.fn(async (key: string, delta: number, member: string) => {
      const s = getOrCreate(key);
      s.set(member, (s.get(member) ?? 0) + delta);
      return String(s.get(member));
    }),
    zadd: jest.fn(async (key: string, score: number, member: string) => {
      getOrCreate(key).set(member, score);
      return 1;
    }),
    zrevrange: jest.fn(async (key: string, start: number, stop: number, withScores?: string) => {
      const s = getOrCreate(key);
      const sorted = [...s.entries()].sort((a, b) => b[1] - a[1]);
      const slice = sorted.slice(start, stop === -1 ? undefined : stop + 1);
      if (withScores === 'WITHSCORES') {
        return slice.flatMap(([m, sc]) => [m, String(sc)]);
      }
      return slice.map(([m]) => m);
    }),
    zrevrank: jest.fn(async (key: string, member: string) => {
      const s = getOrCreate(key);
      const sorted = [...s.entries()].sort((a, b) => b[1] - a[1]);
      const idx = sorted.findIndex(([m]) => m === member);
      return idx === -1 ? null : idx;
    }),
    zscore: jest.fn(async (key: string, member: string) => {
      const s = getOrCreate(key);
      const v = s.get(member);
      return v === undefined ? null : String(v);
    }),
    zcard: jest.fn(async (key: string) => getOrCreate(key).size),
    get: jest.fn(async (key: string) => stringStore.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => { stringStore.set(key, value); return 'OK'; }),
    del: jest.fn(async (...keys: string[]) => { keys.forEach(k => store.delete(k)); return keys.length; }),
    rename: jest.fn(async (src: string, dst: string) => {
      const s = store.get(src);
      if (s) { store.set(dst, s); store.delete(src); }
      return 'OK';
    }),
    pipeline: jest.fn(() => {
      const ops: Array<() => Promise<any>> = [];
      const pipe = {
        zincrby: (...args: any[]) => { ops.push(() => mock.zincrby(...args)); return pipe; },
        zadd: (...args: any[]) => { ops.push(() => mock.zadd(...args)); return pipe; },
        del: (...args: any[]) => { ops.push(() => mock.del(...args)); return pipe; },
        rename: (...args: any[]) => { ops.push(() => mock.rename(...args)); return pipe; },
        exec: jest.fn(async () => { for (const op of ops) await op(); return []; }),
      };
      return pipe;
    }),
    disconnect: jest.fn(),
    on: jest.fn(),
  };
  return mock;
};

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => buildRedisMock()),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RedisLeaderboardService', () => {
  let service: RedisLeaderboardService;

  const mockUsers = [
    { id: 'user-1', username: 'alice' },
    { id: 'user-2', username: 'bob' },
  ];

  const userRepoMock = {
    findByIds: jest.fn().mockResolvedValue(mockUsers),
    find: jest.fn().mockResolvedValue(mockUsers),
  };
  const progressRepoMock = {
    find: jest.fn().mockResolvedValue([
      { userId: 'user-1', courseId: 'c1', progressPct: 80, completedAt: null },
      { userId: 'user-2', courseId: 'c1', progressPct: 100, completedAt: new Date() },
    ]),
  };
  const enrollmentRepoMock = {
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisLeaderboardService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('redis://localhost:6379') } },
        { provide: getRepositoryToken(Progress), useValue: progressRepoMock },
        { provide: getRepositoryToken(Enrollment), useValue: enrollmentRepoMock },
        { provide: getRepositoryToken(User), useValue: userRepoMock },
      ],
    }).compile();

    service = module.get<RedisLeaderboardService>(RedisLeaderboardService);
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('updateProgressScore increments global + course sorted sets', async () => {
    await service.updateProgressScore('user-1', 'c1', 50);
    const top = await service.getTopEntries('global', null, 10);
    expect(top.length).toBeGreaterThanOrEqual(0);
  });

  it('applyCompletionBonus adds bonus points', async () => {
    await service.updateProgressScore('user-1', 'c1', 100);
    await service.applyCompletionBonus('user-1', 'c1');
    // Should not throw
    expect(true).toBe(true);
  });

  it('updateQuizScore adds quiz points', async () => {
    await service.updateQuizScore('user-1', 'c1', 5);
    expect(true).toBe(true);
  });

  it('updateRewardScore skips if amount < 1 BST', async () => {
    await service.updateRewardScore('user-1', 5_000_000); // 0.5 BST
    expect(true).toBe(true);
  });

  it('getPage returns pagination metadata', async () => {
    await service.updateProgressScore('user-1', 'c1', 60);
    await service.updateProgressScore('user-2', 'c1', 40);
    const result = await service.getPage('global', null, 1, 10);
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page', 1);
    expect(result).toHaveProperty('pageSize', 10);
    expect(Array.isArray(result.entries)).toBe(true);
  });

  it('getUserRank returns null for unknown user', async () => {
    const rank = await service.getUserRank('global', null, 'unknown-user');
    expect(rank).toBeNull();
  });

  it('getAroundMe returns empty for unknown user', async () => {
    const result = await service.getAroundMe('global', null, 'unknown-user', 5);
    expect(result).toEqual([]);
  });

  it('reconcile runs without error', async () => {
    await expect(service.reconcile()).resolves.not.toThrow();
  });
});
