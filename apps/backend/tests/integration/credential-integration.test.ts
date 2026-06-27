import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Credential Contract Integration', () => {
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

  describe('Certificate Issuance Workflow', () => {
    it('should issue certificate on course completion', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000';
      const courseId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await request(app.getHttpServer())
        .post('/v1/credentials/issue')
        .set('Authorization', 'Bearer valid-token')
        .send({
          studentId,
          courseId,
          certificateType: 'COMPLETION',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('credentialId');
      expect(response.body).toHaveProperty('transactionHash');
      expect(response.body.status).toBe('ISSUED');
    });

    it('should verify credential on-chain', async () => {
      const credentialId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app.getHttpServer())
        .get(`/v1/credentials/verify/${credentialId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
      expect(response.body).toHaveProperty('issuerPublicKey');
      expect(response.body).toHaveProperty('issuedAt');
    });

    it('should retrieve student credentials', async () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app.getHttpServer())
        .get(`/v1/credentials/student/${studentId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('credentialId');
      expect(response.body[0]).toHaveProperty('courseId');
    });
  });

  describe('Credential Metadata', () => {
    it('should store credential metadata', async () => {
      const credentialId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app.getHttpServer())
        .post(`/v1/credentials/${credentialId}/metadata`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          grade: 'A',
          completionDate: new Date().toISOString(),
          skills: ['Blockchain', 'Smart Contracts'],
        });

      expect(response.status).toBe(201);
      expect(response.body.grade).toBe('A');
      expect(response.body.skills).toContain('Blockchain');
    });

    it('should retrieve credential metadata', async () => {
      const credentialId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app.getHttpServer())
        .get(`/v1/credentials/${credentialId}/metadata`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('grade');
      expect(response.body).toHaveProperty('skills');
    });
  });
});
