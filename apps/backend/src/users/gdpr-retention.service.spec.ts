import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GdprRetentionService } from './gdpr-retention.service';
import { User } from './user.entity';
import { NotFoundException } from '@nestjs/common';

const mockUser = (overrides = {}) => ({
  id: 'u1',
  email: 'test@test.com',
  username: 'tester',
  passwordHash: 'hash',
  verificationToken: null,
  deletedAt: null,
  ...overrides,
});

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((u) => Promise.resolve(u)),
  remove: jest.fn().mockResolvedValue(undefined),
  createQueryBuilder: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
});

describe('GdprRetentionService', () => {
  let service: GdprRetentionService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GdprRetentionService,
        { provide: getRepositoryToken(User), useFactory: mockRepo },
      ],
    }).compile();
    service = module.get(GdprRetentionService);
    repo = module.get(getRepositoryToken(User));
  });

  it('soft-deletes a user by setting deletedAt', async () => {
    repo.findOne.mockResolvedValue(mockUser());
    await service.softDeleteUser('u1');
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: expect.any(Date) }));
  });

  it('throws when soft-deleting non-existent user', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.softDeleteUser('u1')).rejects.toThrow(NotFoundException);
  });

  it('recovers a soft-deleted user', async () => {
    repo.getOne.mockResolvedValue(mockUser({ deletedAt: new Date() }));
    const result = await service.recoverUser('u1');
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: null }));
  });

  it('purges expired soft-deleted users', async () => {
    const expired = [mockUser({ deletedAt: new Date(Date.now() - 40 * 86400000) })];
    repo.find.mockResolvedValue(expired);
    const count = await service.purgeExpiredUsers();
    expect(count).toBe(1);
    expect(repo.remove).toHaveBeenCalledWith(expired);
  });

  it('returns 0 when no expired users', async () => {
    repo.find.mockResolvedValue([]);
    expect(await service.purgeExpiredUsers()).toBe(0);
  });

  it('exports user data without sensitive fields', async () => {
    repo.findOne.mockResolvedValue(mockUser());
    const data = await service.exportUserData('u1');
    expect(data).not.toHaveProperty('passwordHash');
    expect(data).not.toHaveProperty('verificationToken');
    expect(data).toHaveProperty('email');
  });
});
