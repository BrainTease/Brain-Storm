import * as request from 'supertest';
import { setupIntegrationTest, teardownIntegrationTest, clearDatabase, createAuthToken } from './setup';

describe('Users Integration Tests (RBAC)', () => {
  let ctx, userToken, adminToken;

  beforeAll(async () => { 
    ctx = await setupIntegrationTest();
    userToken = await createAuthToken(ctx.server, 'user@test.com');
    adminToken = await createAuthToken(ctx.server, 'admin@test.com');
    await ctx.dataSource.query(`UPDATE "user" SET role = 'admin' WHERE email = 'admin@test.com'`);
  });
  afterAll(async () => { await teardownIntegrationTest(ctx); });

  describe('GET /v1/users', () => {
    it('should deny access to regular users', async () => {
      await request(ctx.server)
        .get('/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should allow access to admin', async () => {
      const res = await request(ctx.server)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /v1/users/:id', () => {
    it('should allow users to view own profile', async () => {
      const profile = await request(ctx.server)
        .get('/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      
      await request(ctx.server)
        .get(`/v1/users/${profile.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should deny users from viewing other profiles', async () => {
      await request(ctx.server)
        .get('/v1/users/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should allow admin to view any profile', async () => {
      const profile = await request(ctx.server)
        .get('/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      
      await request(ctx.server)
        .get(`/v1/users/${profile.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('PATCH /v1/users/:id', () => {
    it('should allow users to update own profile', async () => {
      const profile = await request(ctx.server)
        .get('/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      
      await request(ctx.server)
        .patch(`/v1/users/${profile.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'updated' })
        .expect(200);
    });

    it('should deny role escalation by regular users', async () => {
      const profile = await request(ctx.server)
        .get('/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      
      await request(ctx.server)
        .patch(`/v1/users/${profile.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('should allow admin to change user roles', async () => {
      const profile = await request(ctx.server)
        .get('/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      
      await request(ctx.server)
        .patch(`/v1/users/${profile.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'instructor' })
        .expect(200);
    });
  });

  describe('DELETE /v1/users/:id', () => {
    it('should deny regular users from deleting accounts', async () => {
      await request(ctx.server)
        .delete('/v1/users/1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should allow admin to delete users', async () => {
      const newUser = await createAuthToken(ctx.server, 'delete@test.com');
      const profile = await request(ctx.server)
        .get('/v1/auth/profile')
        .set('Authorization', `Bearer ${newUser}`);
      
      await request(ctx.server)
        .delete(`/v1/users/${profile.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
