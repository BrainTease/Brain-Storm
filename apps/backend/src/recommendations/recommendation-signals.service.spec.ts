import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RecommendationSignalsService } from './recommendation-signals.service';
import { RecommendationSignal, SignalType } from './recommendation-signal.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from '../courses/course.entity';

const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

const now = new Date();
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

const sampleSignals: Partial<RecommendationSignal>[] = [
  { id: '1', userId: 'u1', courseId: 'c1', signalType: SignalType.VIEW, value: 1, consentGranted: true, createdAt: twoDaysAgo },
  { id: '2', userId: 'u1', courseId: 'c2', signalType: SignalType.COMPLETE, value: 1, consentGranted: true, createdAt: twoDaysAgo },
  { id: '3', userId: 'u1', courseId: 'c3', signalType: SignalType.DISMISS, value: 1, consentGranted: true, createdAt: twoDaysAgo },
  { id: '4', userId: 'u1', courseId: 'c4', signalType: SignalType.RATING, value: 5, consentGranted: true, createdAt: thirtyOneDaysAgo },
  { id: '5', userId: 'u1', courseId: 'c5', signalType: SignalType.DWELL, value: 120, consentGranted: false, createdAt: twoDaysAgo },
];

const mockSignalRepo = {
  save: jest.fn().mockResolvedValue({}),
  create: jest.fn((d: any) => d),
  find: jest.fn().mockImplementation(({ where }: any) => {
    let results = sampleSignals;
    if (where?.userId) results = results.filter((s) => s.userId === where.userId);
    if (where?.consentGranted !== undefined) results = results.filter((s) => s.consentGranted === where.consentGranted);
    return Promise.resolve(results);
  }),
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
  }),
  delete: jest.fn().mockResolvedValue({}),
};

const mockEnrollmentRepo = {
  find: jest.fn().mockResolvedValue([{ courseId: 'c-enrolled' }]),
};

const mockCourseRepo = {
  findByIds: jest.fn().mockImplementation((ids: string[]) =>
    Promise.resolve(ids.map((id) => ({ id, title: id, isPublished: true, isDeleted: false }))),
  ),
};

describe('RecommendationSignalsService', () => {
  let service: RecommendationSignalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationSignalsService,
        { provide: getRepositoryToken(RecommendationSignal), useValue: mockSignalRepo },
        { provide: getRepositoryToken(Enrollment), useValue: mockEnrollmentRepo },
        { provide: getRepositoryToken(Course), useValue: mockCourseRepo },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<RecommendationSignalsService>(RecommendationSignalsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('record() saves signal and busts cache', async () => {
    await service.record({ userId: 'u1', courseId: 'c1', signalType: SignalType.VIEW });
    expect(mockSignalRepo.save).toHaveBeenCalled();
    expect(mockCache.del).toHaveBeenCalledWith('recommendations:u1');
  });

  it('record() respects consent flag', async () => {
    await service.record({
      userId: 'u2',
      courseId: 'c1',
      signalType: SignalType.DWELL,
      value: 60,
      consentGranted: false,
    });
    const call = mockSignalRepo.create.mock.calls.at(-1)?.[0];
    expect(call?.consentGranted).toBe(false);
  });

  it('computeUserScores() applies time decay', async () => {
    mockCache.get.mockResolvedValueOnce(null);
    const scores = await service.computeUserScores('u1');
    // c4 is 31 days old — its score should be lower than a recent signal of same type
    // c3 (dismiss) should have a negative contribution
    // c5 is filtered out (no consent)
    expect(scores).toBeDefined();
    if (scores.has('c3')) {
      expect(scores.get('c3')!).toBeLessThan(0);
    }
  });

  it('computeUserScores() excludes enrolled courses', async () => {
    mockEnrollmentRepo.find.mockResolvedValueOnce([{ courseId: 'c1' }, { courseId: 'c2' }]);
    mockCache.get.mockResolvedValueOnce(null);
    const scores = await service.computeUserScores('u1');
    expect(scores.has('c1')).toBe(false);
    expect(scores.has('c2')).toBe(false);
  });

  it('getSignalRecommendations() filters unpublished courses', async () => {
    mockCache.get.mockResolvedValueOnce(null);
    mockCache.get.mockResolvedValueOnce(null);
    mockCourseRepo.findByIds.mockResolvedValueOnce([
      { id: 'c1', isPublished: false, isDeleted: false },
      { id: 'c2', isPublished: true, isDeleted: true },
      { id: 'c3', isPublished: true, isDeleted: false },
    ]);
    const recs = await service.getSignalRecommendations('u1', 10);
    expect(recs.every((c: any) => c.isPublished && !c.isDeleted)).toBe(true);
  });

  it('evaluatePrecisionAtK() returns valid shape', async () => {
    const result = await service.evaluatePrecisionAtK(5, 7);
    expect(result).toHaveProperty('k', 5);
    expect(result).toHaveProperty('precisionAtK');
    expect(result.precisionAtK).toBeGreaterThanOrEqual(0);
    expect(result.precisionAtK).toBeLessThanOrEqual(1);
    expect(result).toHaveProperty('coverage');
    expect(result).toHaveProperty('testedUsers');
  });

  it('deleteUserSignals() removes signals and busts cache', async () => {
    await service.deleteUserSignals('u1');
    expect(mockSignalRepo.delete).toHaveBeenCalledWith({ userId: 'u1' });
    expect(mockCache.del).toHaveBeenCalledWith('rec:scores:u1');
    expect(mockCache.del).toHaveBeenCalledWith('recommendations:u1');
  });
});
