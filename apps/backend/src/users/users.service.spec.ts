import { UsersService } from './users.service';
import { User } from './user.entity';

describe('UsersService', () => {
  /** Mock of the UsersRepository DAO (#976) — the service no longer talks to TypeORM directly. */
  const mockUsersRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const mockImportJobRepo = {};
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(
      mockUsersRepository as unknown as any,
      mockImportJobRepo as unknown as any
    );
  });

  it('findByEmail should query by email', async () => {
    const expected = { id: '1', email: 'test@example.com' } as User;
    mockUsersRepository.findByEmail.mockResolvedValue(expected);

    await expect(service.findByEmail('test@example.com')).resolves.toEqual(expected);
    expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('findById should query by id', async () => {
    const expected = { id: '1', email: 'test@example.com' } as User;
    mockUsersRepository.findById.mockResolvedValue(expected);

    await expect(service.findById('1')).resolves.toEqual(expected);
    expect(mockUsersRepository.findById).toHaveBeenCalledWith('1');
  });

  it('create should persist the user via the repository', async () => {
    const payload: Partial<User> = { email: 'new@example.com' };
    const created = { id: '2', email: 'new@example.com' } as User;
    mockUsersRepository.save.mockResolvedValue(created);

    await expect(service.create(payload)).resolves.toEqual(created);
    expect(mockUsersRepository.save).toHaveBeenCalledWith(payload);
  });

  it('update should return updated user', async () => {
    const existing = { id: '1', email: 'test@example.com' } as User;
    const updated = { id: '1', email: 'test@example.com', username: 'abc' } as User;

    mockUsersRepository.findById.mockResolvedValue(existing);
    mockUsersRepository.save.mockResolvedValue(updated);

    await expect(service.update('1', { username: 'abc' })).resolves.toEqual(updated);
    expect(mockUsersRepository.findById).toHaveBeenCalledWith('1');
    expect(mockUsersRepository.save).toHaveBeenCalledWith({ ...existing, username: 'abc' });
  });

  it('update should throw NotFoundException when user missing', async () => {
    mockUsersRepository.findById.mockResolvedValue(null);

    await expect(service.update('1', { username: 'abc' })).rejects.toThrow('User not found');
  });
});
