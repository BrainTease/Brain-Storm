import * as request from 'supertest';
import { setupIntegrationTest, teardownIntegrationTest, clearDatabase } from './setup';

describe('Auth Integration Tests', () => {
  let ctx;

  beforeAll(async () => { ctx = await setupIntegrationTest(); });
  afterAll(async () => { await teardownIntegrationTest(ctx); });
  beforeEach(async () => { await clearDatabase(ctx.dataSource); });

  describe('POST /v1/auth/register', () => {
    it('should register new user', async () => {
      const res = await request(ctx.server)
        .post('/v1/auth/register')
        .send({ username: 'testuser', email: 'test@test.com', password: 'Test123!' })
        .expect(201);
      
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('test@test.com');
    });

    it('should reject duplicate email', async () => {
      const user = { username: 'test1', email: 'dup@test.com', password: 'Test123!' };
      await request(ctx.server).post('/v1/auth/register').send(user);
      await request(ctx.server).post('/v1/auth/register').send({ ...user, username: 'test2' }).expect(409);
    });

    it('should reject invalid email', async () => {
      await request(ctx.server)
        .post('/v1/auth/register')
        .send({ username: 'test', email: 'invalid', password: 'Test123!' })
        .expect(400);
    });
  });

  describe('POST /v1/auth/login', () => {
    beforeEach(async () => {
      await request(ctx.server)
        .post('/v1/auth/register')
        .send({ username: 'loginuser', email: 'login@test.com', password: 'Test123!' });
    });

    it('should login with valid credentials', async () => {
      const res = await request(ctx.server)
        .post('/v1/auth/login')
        .send({ email: 'login@test.com', password: 'Test123!' })
        .expect(200);
      
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should reject invalid password', async () => {
      await request(ctx.server)
        .post('/v1/auth/login')
        .send({ email: 'login@test.com', password: 'Wrong!' })
        .expect(401);
    });
  });

  describe('GET /v1/auth/profile', () => {
    it('should require authentication', async () => {
      await request(ctx.server).get('/v1/auth/profile').expect(401);
    });

    it('should return user profile when authenticated', async () => {
      await request(ctx.server).post('/v1/auth/register')
        .send({ username: 'prof', email: 'prof@test.com', password: 'Test123!' });
      
      const login = await request(ctx.server).post('/v1/auth/login')
        .send({ email: 'prof@test.com', password: 'Test123!' });
      
      const res = await request(ctx.server)
        .get('/v1/auth/profile')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);
      
      expect(res.body.email).toBe('prof@test.com');
    });
  });
});
