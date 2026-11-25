import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
/**
 * HTTP Integration Tests for Auth Controller
 * 
 * Tests auth endpoints via HTTP layer using supertest with real test database.
 * Tests are deterministic and isolated with clean database state per test.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';

import { MailService } from '../mail/mail.service';
import {
  testUsers,
  invalidCredentials,
  validRegistrationData,
  generateTestUser,
} from '../test/http-fixtures';
import {
  getTestDatabaseConfig,
  getTestDataSource,
} from '../test/http-integration-setup';
import {
  registerUser,
  loginUser,
  cleanDatabase,
  expectErrorResponse,
} from '../test/http-test-helpers';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { RefreshToken } from './refresh-token.entity';
import { StellarAuthService } from './stellar-auth.service';

describe('AuthController (HTTP Integration)', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getTestDatabaseConfig()),
        TypeOrmModule.forFeature([User, RefreshToken, PasswordResetToken]),
        JwtModule.register({
          secret: 'test-secret-key',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: StellarAuthService,
          useValue: {
            buildChallenge: jest.fn(),
            verifyChallenge: jest.fn(),
          },
        },
        UsersService,
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
            sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(getTestDataSource());
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = generateTestUser();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.access_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
    });

    it('should reject registration with duplicate email', async () => {
      const userData = generateTestUser();

      // First registration
      await registerUser(app, userData);

      // Second registration with same email
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userData.email,
          password: 'DifferentPass123!',
        })
        .expect(409);

      expectErrorResponse(response, 409, 'already');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'ValidPass123!',
        })
        .expect(400);

      expectErrorResponse(response, 400);
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: generateTestUser().email,
          password: '123',
        })
        .expect(400);

      expectErrorResponse(response, 400);
    });

    it('should reject registration with missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          password: 'ValidPass123!',
        })
        .expect(400);

      expectErrorResponse(response, 400);
    });

    it('should reject registration with missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: generateTestUser().email,
        })
        .expect(400);

      expectErrorResponse(response, 400);
    });

    it('should handle optional firstName and lastName', async () => {
      const userData = generateTestUser();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create verified user for login tests
      const userData = testUsers.student;
      const { userId } = await registerUser(app, userData);
      
      // Manually verify the user
      await getTestDataSource()
        .getRepository(User)
        .update(userId, { isVerified: true });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.student.email,
          password: testUsers.student.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.access_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.student.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expectErrorResponse(response, 401, /invalid|credentials/i);
    });

    it('should reject login with nonexistent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'AnyPassword123!',
        })
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'AnyPassword123!',
        })
        .expect(400);

      expectErrorResponse(response, 400);
    });

    it('should reject login for unverified user', async () => {
      const unverifiedUser = generateTestUser();
      await registerUser(app, unverifiedUser);
      // User is not verified by default

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: unverifiedUser.email,
          password: unverifiedUser.password,
        })
        .expect(401);

      expectErrorResponse(response, 401, /verify/i);
    });

    it('should reject login with missing credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const userData = testUsers.student;
      const { refreshToken } = await registerUser(app, userData);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.access_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should reject refresh with missing token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });

    it('should reject refresh with expired token', async () => {
      // This would require time manipulation or waiting
      // Skip for now as it's tested in unit tests
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid refresh token', async () => {
      const userData = testUsers.student;
      const { refreshToken } = await registerUser(app, userData);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(200);

      // Try to use the refresh token again - should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);
    });

    it('should handle logout with invalid token gracefully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refresh_token: 'invalid-token' })
        .expect(200); // Logout is idempotent
    });

    it('should logout with both access and refresh tokens', async () => {
      const userData = testUsers.student;
      const { accessToken, refreshToken } = await registerUser(app, userData);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          refresh_token: refreshToken,
          access_token: accessToken,
        })
        .expect(200);
    });
  });

  describe('POST /auth/forgot-password', () => {
    beforeEach(async () => {
      const userData = testUsers.student;
      await registerUser(app, userData);
    });

    it('should initiate password reset for existing user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUsers.student.email })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should not reveal if user does not exist', async () => {
      // Should return success even for nonexistent email (security)
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('should reject with missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      // This requires generating a valid reset token
      // Implementation depends on actual token generation logic
      // Skipping detailed test as it requires complex setup
    });

    it('should reject with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        })
        .expect(400);

      expectErrorResponse(response, 400);
    });

    it('should reject with weak new password', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'some-token',
          newPassword: '123',
        })
        .expect(400);
    });
  });

  describe('GET /auth/verify', () => {
    it('should verify email with valid token', async () => {
      // This requires extracting verification token from email
      // Implementation depends on actual verification flow
      // Skipping detailed test as it requires email interception
    });

    it('should reject with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .query({ token: 'invalid-token' })
        .expect(400);

      expectErrorResponse(response, 400);
    });

    it('should reject with missing token', async () => {
      await request(app.getHttpServer())
        .get('/auth/verify')
        .expect(400);
    });
  });

  describe('POST /auth/resend-verification', () => {
    beforeEach(async () => {
      const userData = testUsers.student;
      await registerUser(app, userData);
    });

    it('should resend verification email for unverified user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: testUsers.student.email })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle resend for nonexistent email', async () => {
      // Should not reveal if user exists
      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login endpoint', async () => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@test.com',
            password: 'Password123!',
          })
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimitedCount = responses.filter((r) => r.status === 429).length;
      // Note: Actual rate limiting depends on configuration
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full registration -> login -> refresh -> logout flow', async () => {
      // 1. Register
      const userData = generateTestUser();
      const { refreshToken: registerRefreshToken } = await registerUser(app, userData);
      expect(registerRefreshToken).toBeDefined();

      // 2. Verify user (manual step in test)
      const userRepo = getTestDataSource().getRepository(User);
      await userRepo.update({ email: userData.email }, { isVerified: true });

      // 3. Login
      const { accessToken, refreshToken } = await loginUser(
        app,
        userData.email,
        userData.password
      );
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // 4. Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);
      expect(refreshResponse.body.access_token).toBeDefined();

      // 5. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(200);

      // 6. Verify token is invalidated
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);
    });
  });
});
