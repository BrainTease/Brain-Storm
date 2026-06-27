import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Contract Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Analytics Contract Interactions', () => {
    it('should record course progress on-chain', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000';
      const courseId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await request(app.getHttpServer())
        .post('/v1/analytics/progress')
        .set('Authorization', 'Bearer valid-token')
        .send({
          studentId,
          courseId,
          progressPercentage: 50,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('transactionHash');
      expect(response.body.progressPercentage).toBe(50);
    });

    it('should retrieve student progress from contract', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app.getHttpServer())
        .get(`/v1/analytics/progress/${studentId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('courseId');
      expect(response.body[0]).toHaveProperty('progressPercentage');
    });
  });

  describe('Token Contract Interactions', () => {
    it('should mint reward tokens on course completion', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000';
      const courseId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await request(app.getHttpServer())
        .post('/v1/token/mint-reward')
        .set('Authorization', 'Bearer valid-token')
        .send({
          studentId,
          courseId,
          amount: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('transactionHash');
      expect(response.body.amount).toBe(100);
    });

    it('should query token balance', async () => {
      const publicKey = 'GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJJBBX7UYXNMWX5YSXF3ZCJXL';

      const response = await request(app.getHttpServer())
        .get(`/v1/stellar/balance/${publicKey}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('balances');
      expect(Array.isArray(response.body.balances)).toBe(true);
    });
  });

  describe('Cross-Contract Interactions', () => {
    it('should complete course and trigger token mint', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000';
      const courseId = '550e8400-e29b-41d4-a716-446655440001';

      // Step 1: Update progress to 100%
      const progressResponse = await request(app.getHttpServer())
        .post('/v1/analytics/progress')
        .set('Authorization', 'Bearer valid-token')
        .send({
          studentId,
          courseId,
          progressPercentage: 100,
        });

      expect(progressResponse.status).toBe(201);

      // Step 2: Verify token was minted
      const tokenResponse = await request(app.getHttpServer())
        .get(`/v1/token/mint-history/${studentId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(tokenResponse.status).toBe(200);
      expect(tokenResponse.body.length).toBeGreaterThan(0);
      expect(tokenResponse.body[0].courseId).toBe(courseId);
    });

    it('should handle concurrent contract calls', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000';
      const courseIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
      ];

      const promises = courseIds.map((courseId) =>
        request(app.getHttpServer())
          .post('/v1/analytics/progress')
          .set('Authorization', 'Bearer valid-token')
          .send({
            studentId,
            courseId,
            progressPercentage: 75,
          }),
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('transactionHash');
      });
    });
  });
});
