/**
 * Unit tests for UsersService — migrated to shared fixtures (#1193).
 *
 * Previously used inline `{ id: '1', email: 'test@example.com' } as User`
 * constructs.  Now all test data comes from @brain-storm/types/test-utils
 * UserFactory so shape changes in User propagate automatically to tests.
 *
 * Migration note: The shared TestUser type uses `firstName`/`lastName`
 * rather than the entity `name` field.  TypeORM-specific fields like
 * `passwordHash`, `stellarPublicKey`, `isBanned`, `mfaEnabled`, and
 * `isVerified` are added as local extensions on top of the factory output.
 *
 * Closes #1193.
 */
import { UserFactory } from '@brain-storm/types/test-utils';
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

/** Extend a TestUser fixture with the TypeORM-specific entity fields. */
function toUserEntity(overrides: Parameters<typeof UserFactory.create>[0] = {}): User {
  const base = UserFactory.create(overrides);
  return {
    ...base,
    passwordHash: `hash_${base.id}`,
    stellarPublicKey: null,
    isBanned: false,
    isVerified: true,
    mfaEnabled: false,
    deletedAt: null,
    referralCode: `ref_${base.id}`,
    referredById: null,
  } as unknown as User;
}

describe('UsersService — shared fixtures (#1193)', () => {
  let service: UsersService;
  let mockRepo: jest.Mocked<UsersRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = buildMockUsersRepository();
    service = new UsersService(mockRepo);
  });

  // ── findByEmail ─────────────────────────────────────────────────────────

  it('findByEmail delegates to the repository', async () => {
    const user = toUserEntity({ email: 'alice@example.com' });
    mockRepo.findByEmail.mockResolvedValue(user);

    await expect(service.findByEmail('alice@example.com')).resolves.toEqual(user);
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('alice@example.com');
  });

  it('findByEmail returns null when user is not found', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);

    await expect(service.findByEmail('nobody@example.com')).resolves.toBeNull();
  });

  // ── findById ─────────────────────────────────────────────────────────────

  it('findById delegates to the repository', async () => {
    const user = toUserEntity();
    mockRepo.findById.mockResolvedValue(user);

    await expect(service.findById(user.id)).resolves.toEqual(user);
    expect(mockRepo.findById).toHaveBeenCalledWith(user.id);
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('create saves via the repository', async () => {
    const payload: Partial<User> = { email: 'new@example.com' };
    const saved = toUserEntity({ email: 'new@example.com' });
    mockRepo.save.mockResolvedValue(saved);

    await expect(service.create(payload)).resolves.toEqual(saved);
    expect(mockRepo.save).toHaveBeenCalledWith(payload);
  });

  // ── update ────────────────────────────────────────────────────────────────

  it('update fetches the user and merges the patch', async () => {
    const existing = toUserEntity({ role: 'student' });
    const updated = { ...existing, username: 'patched-user' } as User;
    mockRepo.findById.mockResolvedValue(existing);
    mockRepo.save.mockResolvedValue(updated);

    await expect(service.update(existing.id, { username: 'patched-user' })).resolves.toEqual(
      updated
    );
    expect(mockRepo.findById).toHaveBeenCalledWith(existing.id);
    expect(mockRepo.save).toHaveBeenCalledWith({ ...existing, username: 'patched-user' });
  });

  it('update throws NotFoundException when user is missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.update('non-existent-id', { username: 'x' })).rejects.toThrow(
      'User not found'
    );
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  // ── banUser ───────────────────────────────────────────────────────────────

  it('banUser sets the isBanned flag via the repository', async () => {
    const user = toUserEntity();
    (user as any).isBanned = false;
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.save.mockResolvedValue({ ...user, isBanned: true } as User);

    await service.banUser(user.id, true);

    expect(mockRepo.save).toHaveBeenCalledWith({ ...user, isBanned: true });
  });

  it('banUser throws NotFoundException when user is missing', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.banUser('ghost-id', true)).rejects.toThrow('User not found');
  });

  // ── changeRole ────────────────────────────────────────────────────────────

  it('changeRole updates the role via the repository', async () => {
    const user = toUserEntity({ role: 'student' });
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.save.mockResolvedValue({ ...user, role: 'instructor' } as User);

    await service.changeRole(user.id, 'instructor');

    expect(mockRepo.save).toHaveBeenCalledWith({ ...user, role: 'instructor' });
  });

  // ── softDelete ────────────────────────────────────────────────────────────

  it('softDelete sets deletedAt timestamp via the repository', async () => {
    const user = toUserEntity();
    (user as any).deletedAt = null;
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.save.mockImplementation(async (u) => u as User);

    await service.softDelete(user.id);

    const saved = mockRepo.save.mock.calls[0][0] as Partial<User>;
    expect(saved.deletedAt).toBeInstanceOf(Date);
  });

  // ── getReferralStats ──────────────────────────────────────────────────────

  it('getReferralStats returns count and earned BST', async () => {
    const user = toUserEntity();
    mockRepo.countReferredBy.mockResolvedValue(4);

    const stats = await service.getReferralStats(user.id);

    expect(mockRepo.countReferredBy).toHaveBeenCalledWith(user.id);
    expect(stats).toEqual({ referralCount: 4, earnedBst: 200 });
  });

  // ── batch factory demonstration ───────────────────────────────────────────

  it('creates many users via factory without ID collisions', () => {
    const users = UserFactory.createMany(5, { role: 'instructor' });
    const ids = new Set(users.map((u) => u.id));

    expect(users).toHaveLength(5);
    expect(ids.size).toBe(5); // all unique
    users.forEach((u) => expect(u.role).toBe('instructor'));
  });

  // ── DI substitution demo (property of the interface) ─────────────────────

  it('accepts a completely different mock at construction time (DI substitution)', async () => {
    const altMock = buildMockUsersRepository();
    const altUser = toUserEntity({ email: 'alt@example.com' });
    altMock.findByEmail.mockResolvedValue(altUser);

    const altService = new UsersService(altMock);
    const result = await altService.findByEmail('alt@example.com');

    expect(result).toBe(altUser);
    // Original mock was never called.
    expect(mockRepo.findByEmail).not.toHaveBeenCalled();
  });
});
