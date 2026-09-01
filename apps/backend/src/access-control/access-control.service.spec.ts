import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccessControlService } from './access-control.service';
import { CourseAccessControl, AccessRole } from './course-access-control.entity';
import { AccessLog } from './access-log.entity';

describe('AccessControlService', () => {
  let service: AccessControlService;

  const mockAccessRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockLogRepo = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const makeAccess = (overrides: Partial<CourseAccessControl> = {}): CourseAccessControl =>
    ({
      id: 'ac-1',
      courseId: 'c1',
      userId: 'u1',
      role: AccessRole.STUDENT,
      isActive: true,
      subscriptionExpiryDate: null,
      allowedIpAddresses: null,
      ...overrides,
    }) as CourseAccessControl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessControlService,
        { provide: getRepositoryToken(CourseAccessControl), useValue: mockAccessRepo },
        { provide: getRepositoryToken(AccessLog), useValue: mockLogRepo },
      ],
    }).compile();
    service = module.get<AccessControlService>(AccessControlService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── grantAccess ─────────────────────────────────────────────────────────────

  describe('grantAccess', () => {
    it('creates and saves an access record', async () => {
      const access = makeAccess();
      mockAccessRepo.create.mockReturnValue(access);
      mockAccessRepo.save.mockResolvedValue(access);

      const result = await service.grantAccess('c1', 'u1', AccessRole.STUDENT);

      expect(mockAccessRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ courseId: 'c1', userId: 'u1', role: AccessRole.STUDENT })
      );
      expect(result).toEqual(access);
    });

    it('passes optional expiry and IP list to create', async () => {
      const expiry = new Date('2030-01-01');
      const ips = ['1.2.3.4'];
      const access = makeAccess({ subscriptionExpiryDate: expiry, allowedIpAddresses: ips });
      mockAccessRepo.create.mockReturnValue(access);
      mockAccessRepo.save.mockResolvedValue(access);

      await service.grantAccess('c1', 'u1', AccessRole.STUDENT, expiry, ips);

      expect(mockAccessRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ subscriptionExpiryDate: expiry, allowedIpAddresses: ips })
      );
    });
  });

  // ── checkAccess ──────────────────────────────────────────────────────────────

  describe('checkAccess', () => {
    const logEntry = {};

    beforeEach(() => {
      mockLogRepo.create.mockReturnValue(logEntry);
      mockLogRepo.save.mockResolvedValue(logEntry);
    });

    it('returns allowed:false with reason when no access record exists', async () => {
      mockAccessRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAccess('c1', 'u1', '1.2.3.4');

      expect(result).toEqual({ allowed: false, reason: 'No access granted' });
    });

    it('returns allowed:false when subscription is expired', async () => {
      const access = makeAccess({ subscriptionExpiryDate: new Date('2000-01-01') });
      mockAccessRepo.findOne.mockResolvedValue(access);

      const result = await service.checkAccess('c1', 'u1', '1.2.3.4');

      expect(result).toEqual({ allowed: false, reason: 'Subscription expired' });
    });

    it('returns allowed:false when IP is not in allowed list', async () => {
      const access = makeAccess({ allowedIpAddresses: ['10.0.0.1'], subscriptionExpiryDate: null });
      mockAccessRepo.findOne.mockResolvedValue(access);

      const result = await service.checkAccess('c1', 'u1', '9.9.9.9');

      expect(result).toEqual({ allowed: false, reason: 'IP not allowed' });
    });

    it('returns allowed:true when IP is in allowed list', async () => {
      const access = makeAccess({ allowedIpAddresses: ['10.0.0.1'], subscriptionExpiryDate: null });
      mockAccessRepo.findOne.mockResolvedValue(access);

      const result = await service.checkAccess('c1', 'u1', '10.0.0.1');

      expect(result).toEqual({ allowed: true });
    });

    it('returns allowed:true when no IP restriction is set', async () => {
      const access = makeAccess({ allowedIpAddresses: null, subscriptionExpiryDate: null });
      mockAccessRepo.findOne.mockResolvedValue(access);

      const result = await service.checkAccess('c1', 'u1', '99.99.99.99');

      expect(result).toEqual({ allowed: true });
    });

    it('returns allowed:true when IP list is empty (no restriction)', async () => {
      const access = makeAccess({ allowedIpAddresses: [], subscriptionExpiryDate: null });
      mockAccessRepo.findOne.mockResolvedValue(access);

      const result = await service.checkAccess('c1', 'u1', '99.99.99.99');

      expect(result).toEqual({ allowed: true });
    });

    it('returns allowed:true when subscription has a future expiry', async () => {
      const access = makeAccess({
        subscriptionExpiryDate: new Date('2099-01-01'),
        allowedIpAddresses: null,
      });
      mockAccessRepo.findOne.mockResolvedValue(access);

      const result = await service.checkAccess('c1', 'u1');

      expect(result).toEqual({ allowed: true });
    });

    it('logs each access check', async () => {
      mockAccessRepo.findOne.mockResolvedValue(null);

      await service.checkAccess('c1', 'u1', '1.2.3.4');

      expect(mockLogRepo.create).toHaveBeenCalled();
      expect(mockLogRepo.save).toHaveBeenCalled();
    });
  });

  // ── revokeAccess ─────────────────────────────────────────────────────────────

  describe('revokeAccess', () => {
    it('sets isActive to false for the given course+user', async () => {
      mockAccessRepo.update.mockResolvedValue({ affected: 1 });

      await service.revokeAccess('c1', 'u1');

      expect(mockAccessRepo.update).toHaveBeenCalledWith(
        { courseId: 'c1', userId: 'u1' },
        { isActive: false }
      );
    });
  });

  // ── updateSubscription ───────────────────────────────────────────────────────

  describe('updateSubscription', () => {
    it('updates the expiry date for the given course+user', async () => {
      const expiry = new Date('2030-06-01');
      mockAccessRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateSubscription('c1', 'u1', expiry);

      expect(mockAccessRepo.update).toHaveBeenCalledWith(
        { courseId: 'c1', userId: 'u1' },
        { subscriptionExpiryDate: expiry }
      );
    });
  });
});
