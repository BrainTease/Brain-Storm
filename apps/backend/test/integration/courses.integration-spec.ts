import * as request from 'supertest';
import { setupIntegrationTest, teardownIntegrationTest, clearDatabase, createAuthToken } from './setup';

describe('Courses Integration Tests', () => {
  let ctx, token, adminToken;

  beforeAll(async () => { 
    ctx = await setupIntegrationTest();
    token = await createAuthToken(ctx.server);
    adminToken = await createAuthToken(ctx.server, 'admin@test.com');
    await ctx.dataSource.query(`UPDATE "user" SET role = 'admin' WHERE email = 'admin@test.com'`);
  });
  afterAll(async () => { await teardownIntegrationTest(ctx); });
  beforeEach(async () => { 
    await ctx.dataSource.query(`DELETE FROM course WHERE 1=1`);
  });

  describe('GET /v1/courses', () => {
    it('should return empty array when no courses', async () => {
      const res = await request(ctx.server).get('/v1/courses').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return published courses', async () => {
      await ctx.dataSource.query(
        `INSERT INTO course (title, description, status, "instructorId") VALUES ($1, $2, $3, 1)`,
        ['Test Course', 'Description', 'published']
      );
      const res = await request(ctx.server).get('/v1/courses').expect(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /v1/courses', () => {
    it('should require authentication', async () => {
      await request(ctx.server).post('/v1/courses').send({ title: 'Test' }).expect(401);
    });

    it('should create course with valid data', async () => {
      const res = await request(ctx.server)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Course', description: 'Test description', status: 'draft' })
        .expect(201);
      
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Course');
    });

    it('should reject invalid data', async () => {
      await request(ctx.server)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '' })
        .expect(400);
    });
  });

  describe('GET /v1/courses/:id', () => {
    it('should return 404 for non-existent course', async () => {
      await request(ctx.server).get('/v1/courses/99999').expect(404);
    });

    it('should return course details', async () => {
      const created = await request(ctx.server)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Detail Test', description: 'Test', status: 'published' });
      
      const res = await request(ctx.server).get(`/v1/courses/${created.body.id}`).expect(200);
      expect(res.body.title).toBe('Detail Test');
    });
  });

  describe('PATCH /v1/courses/:id', () => {
    it('should update own course', async () => {
      const created = await request(ctx.server)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Original', description: 'Test', status: 'draft' });
      
      await request(ctx.server)
        .patch(`/v1/courses/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' })
        .expect(200);
    });
  });

  describe('DELETE /v1/courses/:id', () => {
    it('should require admin role', async () => {
      const created = await request(ctx.server)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'To Delete', description: 'Test', status: 'draft' });
      
      await request(ctx.server)
        .delete(`/v1/courses/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should allow admin to delete', async () => {
      const created = await request(ctx.server)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Delete', description: 'Test', status: 'draft' });
      
      await request(ctx.server)
        .delete(`/v1/courses/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
