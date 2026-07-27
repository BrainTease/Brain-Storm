import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { setupTestDatabase, teardownTestDatabase } from '../test/integration-test.setup';

describe('UsersService (Integration)', () => {
  let service: UsersService;
  let module: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();

    module = await Test.createTestingModule({
      imports: [TypeOrmModule.forFeature([User])],
      providers: [UsersService],
    })
      .overrideProvider('DataSource')
      .useValue(dataSource)
      .compile();

    service = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module.close();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    const repo = dataSource.getRepository(User);
    await repo.clear();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
      };

      const user = await service.create(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe('John');
    });

    it('should not allow duplicate emails', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
      };

      await service.create(userData);

      await expect(service.create(userData)).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'find@example.com',
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      await service.create(userData);
      const found = await service.findByEmail(userData.email);

      expect(found).toBeDefined();
      expect(found.email).toBe(userData.email);
    });

    it('should return null for non-existent email', async () => {
      const found = await service.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const created = await service.create({
        email: 'byid@example.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
      });

      const found = await service.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });
  });

  describe('findAll', () => {
    it('should return all users with pagination', async () => {
      await service.create({
        email: 'user1@example.com',
        password: 'pass',
        firstName: 'User',
        lastName: 'One',
        role: 'student',
      });

      await service.create({
        email: 'user2@example.com',
        password: 'pass',
        firstName: 'User',
        lastName: 'Two',
        role: 'instructor',
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by role', async () => {
      await service.create({
        email: 'student@example.com',
        password: 'pass',
        firstName: 'Student',
        lastName: 'User',
        role: 'student',
      });

      await service.create({
        email: 'instructor@example.com',
        password: 'pass',
        firstName: 'Instructor',
        lastName: 'User',
        role: 'instructor',
      });

      const result = await service.findAll({ role: 'student' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe('student');
    });

    it('should filter by verification status', async () => {
      await service.create({
        email: 'verified@example.com',
        password: 'pass',
        firstName: 'Verified',
        lastName: 'User',
        isVerified: true,
      });

      await service.create({
        email: 'unverified@example.com',
        password: 'pass',
        firstName: 'Unverified',
        lastName: 'User',
        isVerified: false,
      });

      const result = await service.findAll({ isVerified: true });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].isVerified).toBe(true);
    });

    it('should search by email', async () => {
      await service.create({
        email: 'search@example.com',
        password: 'pass',
        firstName: 'Search',
        lastName: 'User',
      });

      const result = await service.findAll({ search: 'search' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toContain('search');
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const created = await service.create({
        email: 'update@example.com',
        password: 'pass',
        firstName: 'Original',
        lastName: 'Name',
      });

      const updated = await service.update(created.id, {
        firstName: 'Updated',
      });

      expect(updated.firstName).toBe('Updated');
      expect(updated.lastName).toBe('Name');
    });
  });

  describe('changeRole', () => {
    it('should change user role', async () => {
      const created = await service.create({
        email: 'role@example.com',
        password: 'pass',
        firstName: 'Role',
        lastName: 'User',
        role: 'student',
      });

      const updated = await service.changeRole(created.id, 'instructor');

      expect(updated.role).toBe('instructor');
    });
  });

  describe('banUser', () => {
    it('should ban a user', async () => {
      const created = await service.create({
        email: 'ban@example.com',
        password: 'pass',
        firstName: 'Ban',
        lastName: 'User',
        isBanned: false,
      });

      const banned = await service.banUser(created.id, true);

      expect(banned.isBanned).toBe(true);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a user', async () => {
      const created = await service.create({
        email: 'delete@example.com',
        password: 'pass',
        firstName: 'Delete',
        lastName: 'User',
      });

      const deleted = await service.softDelete(created.id);

      expect(deleted.deletedAt).toBeDefined();
    });
  });
});
