/**
 * #1177 — Comprehensive unit tests for GrantsService
 *
 * Covers the full grant lifecycle: creation, listing/pagination, retrieval,
 * updates (with authorisation), removal, and the disbursement lifecycle
 * including rejection, partial funding, and on-chain confirmation failure.
 *
 * The `stellar` module dependencies are mocked so no network calls are made.
 */
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grant } from '../grant.entity';
import { GrantsService } from '../grants.service';
import { GrantsBusinessService } from '../grants-business.service';
import { CreateGrantDto, UpdateGrantDto } from '../dto/grant.dto';

// Mock the stellar module dependencies used by the grants domain.
jest.mock('stellar-sdk', () => ({
  Horizon: { Server: jest.fn().mockImplementation(() => ({
    submitTransaction: jest.fn(),
    transactions: jest.fn().mockReturnValue({ transaction: jest.fn() }),
  })) },
  Keypair: { fromSecret: jest.fn().mockReturnValue({ publicKey: () => 'GTEST' }) },
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
}));

const makeGrant = (overrides: Partial<Grant> = {}): Grant =>
  ({
    id: 'grant-1',
    title: 'Test Grant',
    description: 'desc',
    amount: 1000,
    fundedAmount: 0,
    status: 'OPEN',
    ownerId: 'owner-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as unknown as Grant);

describe('GrantsService', () => {
  let service: GrantsService;
  let repo: jest.Mocked<Repository<Grant>>;
  let business: jest.Mocked<GrantsBusinessService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrantsService,
        {
          provide: getRepositoryToken(Grant),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: GrantsBusinessService,
          useValue: {
            applyCreateDefaults: jest.fn((dto) => dto),
            resolvePagination: jest.fn((page = 1, limit = 10) => ({
              page,
              limit,
              skip: (page - 1) * limit,
            })),
            assertUpdatePermission: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(GrantsService);
    repo = module.get(getRepositoryToken(Grant));
    business = module.get(GrantsBusinessService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('applies defaults and persists the grant', async () => {
      const dto: CreateGrantDto = { title: 'New', description: 'd', amount: 500 } as CreateGrantDto;
      const created = makeGrant({ title: 'New' });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(business.applyCreateDefaults).toHaveBeenCalledWith(dto);
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });
  });

  describe('findAll', () => {
    it('returns paginated grants with status filter', async () => {
      const data = [makeGrant()];
      repo.findAndCount.mockResolvedValue([data, 1]);

      const result = await service.findAll({ page: 2, limit: 5, status: 'OPEN' } as any);

      expect(business.resolvePagination).toHaveBeenCalledWith(2, 5);
      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { status: 'OPEN' },
        order: { createdAt: 'DESC' },
        skip: 5,
        take: 5,
      });
      expect(result).toEqual({ data, total: 1, page: 2, limit: 5 });
    });

    it('omits status filter when not provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({} as any);
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });
  });

  describe('findOne', () => {
    it('returns the grant when found', async () => {
      const grant = makeGrant();
      repo.findOne.mockResolvedValue(grant);
      await expect(service.findOne('grant-1')).resolves.toBe(grant);
    });

    it('throws NotFoundException when missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('checks permission and saves changes', async () => {
      const grant = makeGrant();
      repo.findOne.mockResolvedValue(grant);
      repo.save.mockResolvedValue({ ...grant, title: 'Updated' } as Grant);
      const dto: UpdateGrantDto = { title: 'Updated' } as UpdateGrantDto;

      const result = await service.update('grant-1', dto, 'owner-1');

      expect(business.assertUpdatePermission).toHaveBeenCalledWith(grant, dto, 'owner-1');
      expect(result.title).toBe('Updated');
    });

    it('propagates permission errors', async () => {
      repo.findOne.mockResolvedValue(makeGrant());
      business.assertUpdatePermission.mockImplementation(() => {
        throw new Error('forbidden');
      });
      await expect(
        service.update('grant-1', {} as UpdateGrantDto, 'stranger')
      ).rejects.toThrow('forbidden');
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes an existing grant', async () => {
      const grant = makeGrant();
      repo.findOne.mockResolvedValue(grant);
      repo.remove.mockResolvedValue(grant);
      await service.remove('grant-1');
      expect(repo.remove).toHaveBeenCalledWith(grant);
    });

    it('throws when grant does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('disbursement lifecycle', () => {
    it('marks a fully funded grant as DISBURSED', async () => {
      const grant = makeGrant({ status: 'FUNDED', fundedAmount: 1000, amount: 1000 });
      repo.findOne.mockResolvedValue(grant);
      repo.save.mockImplementation(async (g) => g as Grant);

      const result = await service.update(
        'grant-1',
        { status: 'DISBURSED' } as UpdateGrantDto,
        'owner-1'
      );

      expect(result.status).toBe('DISBURSED');
      expect(repo.save).toHaveBeenCalled();
    });

    it('handles rejection path', async () => {
      const grant = makeGrant({ status: 'OPEN' });
      repo.findOne.mockResolvedValue(grant);
      repo.save.mockImplementation(async (g) => g as Grant);

      const result = await service.update(
        'grant-1',
        { status: 'REJECTED' } as UpdateGrantDto,
        'owner-1'
      );

      expect(result.status).toBe('REJECTED');
    });

    it('handles partial funding path', async () => {
      const grant = makeGrant({ status: 'OPEN', amount: 1000, fundedAmount: 0 });
      repo.findOne.mockResolvedValue(grant);
      repo.save.mockImplementation(async (g) => g as Grant);

      const result = await service.update(
        'grant-1',
        { fundedAmount: 400 } as UpdateGrantDto,
        'owner-1'
      );

      expect(result.fundedAmount).toBe(400);
      expect(result.status).toBe('OPEN');
    });

    it('surfaces on-chain confirmation failure', async () => {
      const grant = makeGrant({ status: 'FUNDED' });
      repo.findOne.mockResolvedValue(grant);
      repo.save.mockRejectedValue(new Error('on-chain confirmation failed'));

      await expect(
        service.update('grant-1', { status: 'DISBURSED' } as UpdateGrantDto, 'owner-1')
      ).rejects.toThrow('on-chain confirmation failed');
    });
  });
});
