import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlag, FlagType } from './feature-flag.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((d) => d),
  save: jest.fn((d) => Promise.resolve({ ...d, key: d.key ?? 'test' })),
  remove: jest.fn(),
});
const mockCache = () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() });

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let repo: ReturnType<typeof mockRepo>;
  let cache: ReturnType<typeof mockCache>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        { provide: getRepositoryToken(FeatureFlag), useFactory: mockRepo },
        { provide: CACHE_MANAGER, useFactory: mockCache },
      ],
    }).compile();
    service = module.get(FeatureFlagsService);
    repo = module.get(getRepositoryToken(FeatureFlag));
    cache = module.get(CACHE_MANAGER);
  });

  it('returns false for disabled flag', async () => {
    cache.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue({ enabled: false, type: FlagType.BOOLEAN });
    expect(await service.evaluate('flag-x')).toBe(false);
  });

  it('returns true for enabled boolean flag', async () => {
    cache.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue({ enabled: true, type: FlagType.BOOLEAN });
    expect(await service.evaluate('flag-x')).toBe(true);
  });

  it('evaluates percentage flag consistently for same user', async () => {
    const flag = { enabled: true, type: FlagType.PERCENTAGE, percentage: 50 };
    cache.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue(flag);
    const r1 = await service.evaluate('flag-x', 'user-1');
    cache.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue(flag);
    const r2 = await service.evaluate('flag-x', 'user-1');
    expect(r1).toBe(r2);
  });

  it('evaluates user-targeted flag', async () => {
    cache.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue({
      enabled: true,
      type: FlagType.USER_TARGETED,
      targetedUserIds: ['user-42'],
    });
    expect(await service.evaluate('flag-x', 'user-42')).toBe(true);
    cache.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue({
      enabled: true,
      type: FlagType.USER_TARGETED,
      targetedUserIds: ['user-42'],
    });
    expect(await service.evaluate('flag-x', 'user-99')).toBe(false);
  });

  describe('auditFullyRolledOutFlags', () => {
    it('flags enabled boolean flags with no targeting as removal candidates', async () => {
      repo.find.mockResolvedValue([
        { key: 'grants-v2', enabled: true, type: FlagType.BOOLEAN },
        { key: 'cohorts-beta', enabled: false, type: FlagType.BOOLEAN },
      ]);
      const result = await service.auditFullyRolledOutFlags();
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('grants-v2');
    });

    it('flags percentage rollouts at 100% as removal candidates', async () => {
      repo.find.mockResolvedValue([
        { key: 'new-leaderboard', enabled: true, type: FlagType.PERCENTAGE, percentage: 100 },
        { key: 'partial-rollout', enabled: true, type: FlagType.PERCENTAGE, percentage: 50 },
      ]);
      const result = await service.auditFullyRolledOutFlags();
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('new-leaderboard');
    });

    it('excludes user-targeted flags since they are not fully rolled out', async () => {
      repo.find.mockResolvedValue([
        { key: 'beta-testers', enabled: true, type: FlagType.USER_TARGETED, targetedUserIds: ['u1'] },
      ]);
      const result = await service.auditFullyRolledOutFlags();
      expect(result).toHaveLength(0);
    });
  });
});
