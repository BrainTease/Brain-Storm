/**
 * Unit tests for UsersService.
 *
 * Demonstrates mock substitution (#996): the service depends on the
 * UsersRepository interface via the USERS_REPOSITORY_TOKEN injection token.
 * Tests swap in a plain mock object — no TypeORM or database involved.
 */
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UsersRepository } from '../repositories/users-repository.interface';

/** Build a fully-typed mock that satisfies the UsersRepository interface. */
function buildMockUsersRepository(): jest.Mocked<UsersRepository> {
  return {
    findByEmail: jest.fn(),
    findByVerificationToken: jest.fn(),
    findByStellarPublicKey: jest.fn(),
    findByReferralCode: jest.fn(),
    findById: jest.fn(),
    countReferredBy: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    findAll: jest.fn(),
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let mockRepo: jest.Mocked<UsersRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = buildMockUsersRepository();
    // Constructor-inject the mock — no NestJS test module needed.
    service = new UsersService(mockRepo);
  });

  // ── findByEmail ───────────────────────────────────────────────────────────

  it('findByEmail delegates to the repository', async () => {
    const expected = { id: '1', email: 'test@example.com' } as User;
    mockRepo.findByEmail.mockResolvedValue(expected);

    await expect(service.findByEmail('test@example.com')).resolves.toEqual(expected);
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
  });

  // ── findById ──────────────────────────────────────────────────────────────

  it('findById delegates to the repository', async () => {
    const expected = { id: '1', email: 'test@example.com' } as User;
    mockRepo.findById.mockResolvedValue(expected);

    await expect(service.findById('1')).resolves.toEqual(expected);
    expect(mockRepo.findById).toHaveBeenCalledWith('1');
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('create saves via the repository', async () => {
    const payload: Partial<User> = { email: 'new@example.com' };
    const saved = { id: '2', email: 'new@example.com' } as User;
    mockRepo.save.mockResolvedValue(saved);

    await expect(service.create(payload)).resolves.toEqual(saved);
    expect(mockRepo.save).toHaveBeenCalledWith(payload);
  });

  // ── update ────────────────────────────────────────────────────────────────

  it('update fetches the user and merges the patch', async () => {
    const existing = { id: '1', email: 'test@example.com' } as User;
    const updated = { id: '1', email: 'test@example.com', username: 'abc' } as User;
    mockRepo.findById.mockResolvedValue(existing);
    mockRepo.save.mockResolvedValue(updated);

    await expect(service.update('1', { username: 'abc' })).resolves.toEqual(updated);
    expect(mockRepo.findById).toHaveBeenCalledWith('1');
    expect(mockRepo.save).toHaveBeenCalledWith({ ...existing, username: 'abc' });
  });

  it('update throws NotFoundException when user is missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.update('1', { username: 'abc' })).rejects.toThrow('User not found');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  // ── banUser ───────────────────────────────────────────────────────────────

  it('banUser sets the isBanned flag via the repository', async () => {
    const user = { id: '1', isBanned: false } as User;
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.save.mockResolvedValue({ ...user, isBanned: true } as User);

    await service.banUser('1', true);

    expect(mockRepo.save).toHaveBeenCalledWith({ ...user, isBanned: true });
  });

  it('banUser throws NotFoundException when user is missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.banUser('1', true)).rejects.toThrow('User not found');
  });

  // ── changeRole ────────────────────────────────────────────────────────────

  it('changeRole updates the role via the repository', async () => {
    const user = { id: '1', role: 'student' } as User;
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.save.mockResolvedValue({ ...user, role: 'instructor' } as User);

    await service.changeRole('1', 'instructor');

    expect(mockRepo.save).toHaveBeenCalledWith({ ...user, role: 'instructor' });
  });

  // ── softDelete ────────────────────────────────────────────────────────────

  it('softDelete sets deletedAt timestamp via the repository', async () => {
    const user = { id: '1', deletedAt: null } as User;
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.save.mockImplementation(async (u) => u as User);

    await service.softDelete('1');

    const saved = mockRepo.save.mock.calls[0][0] as Partial<User>;
    expect(saved.deletedAt).toBeInstanceOf(Date);
  });

  // ── getReferralStats ──────────────────────────────────────────────────────

  it('getReferralStats returns count and earned BST', async () => {
    mockRepo.countReferredBy.mockResolvedValue(4);

    const stats = await service.getReferralStats('user-1');

    expect(mockRepo.countReferredBy).toHaveBeenCalledWith('user-1');
    expect(stats).toEqual({ referralCount: 4, earnedBst: 200 });
  });

  // ── mock substitution demonstration (#996) ────────────────────────────────

  it('accepts a completely different mock at construction time (DI substitution)', async () => {
    // Swap in a second independent mock to prove the service is not coupled
    // to any concrete class — only to the UsersRepository interface.
    const altMock = buildMockUsersRepository();
    const altUser = { id: 'alt', email: 'alt@example.com' } as User;
    altMock.findByEmail.mockResolvedValue(altUser);

    const altService = new UsersService(altMock);
    const result = await altService.findByEmail('alt@example.com');

    expect(result).toBe(altUser);
    // Original mock was never called.
    expect(mockRepo.findByEmail).not.toHaveBeenCalled();
  });
});
