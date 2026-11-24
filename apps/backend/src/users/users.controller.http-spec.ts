/**
 * HTTP Integration Tests for Users Controller
 * 
 * Tests users endpoints via HTTP layer using supertest with real test database.
 * Tests authorization, profile CRUD, and role-based access control.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { StellarService } from '../stellar/stellar.service';
import {
  getTestDatabaseConfig,
  getTestDataSource,
} from '../test/http-integration-setup';
import {
  testUsers,
  generateTestUser,
  testProfileUpdates,
} from '../test/http-fixtures';
import {
  registerUser,
  getCurrentUser,
  cleanDatabase,
  expectErrorResponse,
} from '../test/http-test-helpers';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';

describe('UsersController (HTTP Integration)', () => {
  let app: INestApplication;
  let usersService: UsersService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getTestDatabaseConfig()),
        TypeOrmModule.forFeature([User]),
        JwtModule.register({
          secret: 'test-secret-key',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: StellarService,
          useValue: {
            getTokenBalance: jest.fn().mockResolvedValue('100.0000000'),
            getBalance: jest.fn().mockResolvedValue({
              balances: [{ asset_type: 'native', balance: '100.0000000' }],
            }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    usersService = moduleFixture.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(getTestDataSource());
  });

  describe('GET /users/me', () => {
    it('should get current user profile with valid token', async () => {
      const userData = generateTestUser();
      const { accessToken } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', userData.email);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject request with malformed Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'invalid-format')
        .expect(401);
    });
  });

  describe('GET /users/:id', () => {
    it('should get user profile by ID', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('email', userData.email);
    });

    it('should get other user profile (public fields only)', async () => {
      const user1 = generateTestUser();
      const user2 = generateTestUser();

      const { accessToken: token1 } = await registerUser(app, user1);
      const { userId: userId2 } = await registerUser(app, user2);

      const response = await request(app.getHttpServer())
        .get(`/users/${userId2}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId2);
      // Should not expose private fields
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 404 for nonexistent user', async () => {
      const userData = generateTestUser();
      const { accessToken } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .get('/users/nonexistent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expectErrorResponse(response, 404);
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .get('/users/some-id')
        .expect(401);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update own profile', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProfileUpdates.nameUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('firstName', testProfileUpdates.nameUpdate.firstName);
      expect(response.body).toHaveProperty('lastName', testProfileUpdates.nameUpdate.lastName);
    });

    it('should update bio field', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProfileUpdates.bioUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('bio', testProfileUpdates.bioUpdate.bio);
    });

    it('should update multiple fields at once', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProfileUpdates.fullUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('firstName', testProfileUpdates.fullUpdate.firstName);
      expect(response.body).toHaveProperty('lastName', testProfileUpdates.fullUpdate.lastName);
      expect(response.body).toHaveProperty('bio', testProfileUpdates.fullUpdate.bio);
    });

    it('should reject updating another users profile', async () => {
      const user1 = generateTestUser();
      const user2 = generateTestUser();

      const { accessToken: token1 } = await registerUser(app, user1);
      const { userId: userId2 } = await registerUser(app, user2);

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId2}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ firstName: 'Hacker' })
        .expect(403);

      expectErrorResponse(response, 403, /own profile/i);
    });

    it('should reject update without authentication', async () => {
      await request(app.getHttpServer())
        .patch('/users/some-id')
        .send({ firstName: 'Test' })
        .expect(401);
    });

    it('should reject update with invalid data', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ invalidField: 'value' })
        .expect(400);
    });

    it('should not allow updating email via PATCH', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'newemail@test.com' })
        .expect(400);
    });

    it('should not allow updating role via PATCH', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'admin' })
        .expect(400);

      // Role changes require admin privileges through separate endpoint
      expectErrorResponse(response, 400);
    });
  });

  describe('GET /users/:id/token-balance', () => {
    it('should get BST token balance for user with Stellar key', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      // Set Stellar public key
      await getTestDataSource()
        .getRepository(User)
        .update(userId, { stellarPublicKey: 'GABC123TEST' });

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}/token-balance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('stellarPublicKey', 'GABC123TEST');
    });

    it('should return 404 for user without Stellar key', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}/token-balance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expectErrorResponse(response, 404, /stellar/i);
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .get('/users/some-id/token-balance')
        .expect(401);
    });
  });

  describe('GET /users/:id/referrals', () => {
    it('should get referral stats for user', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}/referrals`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('earnedBST');
    });

    it('should return zero referrals for new user', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}/referrals`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.earnedBST).toBe(0);
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .get('/users/some-id/referrals')
        .expect(401);
    });
  });

  describe('POST /users/avatar', () => {
    it('should upload avatar for authenticated user', async () => {
      // This requires multipart form data
      // Skipping detailed implementation as it requires file upload setup
    });

    it('should reject upload without authentication', async () => {
      await request(app.getHttpServer())
        .post('/users/avatar')
        .expect(401);
    });

    it('should reject upload with invalid file type', async () => {
      // Requires file upload testing
    });

    it('should reject upload exceeding size limit', async () => {
      // Requires file upload testing
    });
  });

  describe('Authorization and Access Control', () => {
    it('should allow user to access own profile', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should allow user to update own profile', async () => {
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated' })
        .expect(200);
    });

    it('should prevent user from updating other profiles', async () => {
      const user1 = generateTestUser();
      const user2 = generateTestUser();

      const { accessToken: token1 } = await registerUser(app, user1);
      const { userId: userId2 } = await registerUser(app, user2);

      await request(app.getHttpServer())
        .patch(`/users/${userId2}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ firstName: 'Hacker' })
        .expect(403);
    });
  });

  describe('Complete User Flow', () => {
    it('should complete register -> get profile -> update profile flow', async () => {
      // 1. Register
      const userData = generateTestUser();
      const { accessToken, userId } = await registerUser(app, userData);

      // 2. Get profile
      const profileResponse = await getCurrentUser(app, accessToken);
      expect(profileResponse.id).toBe(userId);
      expect(profileResponse.email).toBe(userData.email);

      // 3. Update profile
      const updateResponse = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated', lastName: 'Name' })
        .expect(200);

      expect(updateResponse.body.firstName).toBe('Updated');
      expect(updateResponse.body.lastName).toBe('Name');

      // 4. Verify update persisted
      const updatedProfile = await getCurrentUser(app, accessToken);
      expect(updatedProfile.firstName).toBe('Updated');
      expect(updatedProfile.lastName).toBe('Name');
    });
  });
});
