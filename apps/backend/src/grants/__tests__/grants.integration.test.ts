/**
 * Issue #843 — Integration Tests for Grants API Endpoints
 *
 * Strategy:
 *  - Bootstrap a minimal NestJS application with an in-memory SQLite database
 *    so tests run without a live PostgreSQL instance.
 *  - The JwtAuthGuard is overridden with a passthrough mock so all requests
 *    are treated as authenticated; authorization behaviour is tested separately
 *    by asserting 403 from GrantsService.
 *  - Schema is synchronised before the suite starts and the table is truncated
 *    between tests via `beforeEach` to guarantee isolation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';

import { GrantsModule } from '../grants.module';
import { Grant } from '../grant.entity';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

// ── Auth stub ────────────────────────────────────────────────────────────────

/** Passthrough guard that injects a deterministic test user into every request. */
class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'test-user-id', sub: 'test-user-id', role: 'student' };
    return true;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeGrantPayload(
  overrides: Partial<{
    title: string;
    description: string;
    amount: number;
    currency: string;
    applicantId: string;
  }> = {}
) {
  return {
    title: 'Stellar Education Initiative',
    description: 'A grant to fund blockchain education in underserved communities.',
    amount: 5000,
    currency: 'USD',
    applicantId: 'test-user-id',
    ...overrides,
  };
}

// ── Suite setup ──────────────────────────────────────────────────────────────

describe('Grants API Integration Tests', () => {
  let app: INestApplication;
  let grantsRepo: Repository<Grant>;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Grant],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        GrantsModule,
      ],
    })
      // Replace JWT guard for the entire application
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();

    // Mirror the production pipe setup for validation coverage
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      })
    );

    await app.init();

    grantsRepo = moduleRef.get<Repository<Grant>>(getRepositoryToken(Grant));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Wipe the grants table before every test for full isolation
    await grantsRepo.clear();
  });

  // ── POST /v1/grants ─────────────────────────────────────────────────────────

  describe('POST /v1/grants', () => {
    it('creates a grant with a valid payload and returns 201', async () => {
      const payload = makeGrantPayload();

      const res = await request(app.getHttpServer()).post('/v1/grants').send(payload).expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(Number(res.body.amount)).toBe(payload.amount);
      expect(res.body.currency).toBe(payload.currency);
      expect(res.body.applicantId).toBe(payload.applicantId);
      expect(res.body.status).toBe('open');
      expect(res.body.createdAt).toBeDefined();
    });

    it('defaults currency to USD when not provided', async () => {
      const { currency: _omitted, ...payload } = makeGrantPayload();

      const res = await request(app.getHttpServer()).post('/v1/grants').send(payload).expect(201);

      expect(res.body.currency).toBe('USD');
    });

    it('returns 400 when title is missing', async () => {
      const { title: _omitted, ...payload } = makeGrantPayload();

      const res = await request(app.getHttpServer()).post('/v1/grants').send(payload).expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('returns 400 when description is missing', async () => {
      const { description: _omitted, ...payload } = makeGrantPayload();

      await request(app.getHttpServer()).post('/v1/grants').send(payload).expect(400);
    });

    it('returns 400 when amount is missing', async () => {
      const { amount: _omitted, ...payload } = makeGrantPayload();

      await request(app.getHttpServer()).post('/v1/grants').send(payload).expect(400);
    });

    it('returns 400 when amount is zero or negative', async () => {
      await request(app.getHttpServer())
        .post('/v1/grants')
        .send(makeGrantPayload({ amount: 0 }))
        .expect(400);

      await request(app.getHttpServer())
        .post('/v1/grants')
        .send(makeGrantPayload({ amount: -100 }))
        .expect(400);
    });

    it('returns 400 when applicantId is missing', async () => {
      const { applicantId: _omitted, ...payload } = makeGrantPayload();

      await request(app.getHttpServer()).post('/v1/grants').send(payload).expect(400);
    });
  });

  // ── GET /v1/grants ──────────────────────────────────────────────────────────

  describe('GET /v1/grants', () => {
    beforeEach(async () => {
      // Seed three grants for list tests
      await grantsRepo.save([
        grantsRepo.create(makeGrantPayload({ title: 'Grant Alpha' })),
        grantsRepo.create({ ...makeGrantPayload({ title: 'Grant Beta' }), status: 'approved' }),
        grantsRepo.create({ ...makeGrantPayload({ title: 'Grant Gamma' }), status: 'rejected' }),
      ]);
    });

    it('returns 200 with a paginated list of all grants', async () => {
      const res = await request(app.getHttpServer()).get('/v1/grants').expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(3);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });

    it('paginates results correctly with page and limit params', async () => {
      const res = await request(app.getHttpServer()).get('/v1/grants?page=1&limit=2').expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
    });

    it('returns an empty second page when all items fit on page one', async () => {
      const res = await request(app.getHttpServer()).get('/v1/grants?page=2&limit=10').expect(200);

      expect(res.body.data.length).toBe(0);
      expect(res.body.total).toBe(3);
    });

    it('filters grants by status', async () => {
      const res = await request(app.getHttpServer()).get('/v1/grants?status=approved').expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('approved');
    });

    it('returns an empty data array when no grants match the status filter', async () => {
      const res = await request(app.getHttpServer()).get('/v1/grants?status=closed').expect(200);

      expect(res.body.data.length).toBe(0);
      expect(res.body.total).toBe(0);
    });

    it('returns grants in descending createdAt order', async () => {
      const res = await request(app.getHttpServer()).get('/v1/grants').expect(200);

      const dates = res.body.data.map((g: Grant) => new Date(g.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });
  });

  // ── GET /v1/grants/:id ──────────────────────────────────────────────────────

  describe('GET /v1/grants/:id', () => {
    it('returns 200 with the grant when the ID exists', async () => {
      const saved = await grantsRepo.save(grantsRepo.create(makeGrantPayload()));

      const res = await request(app.getHttpServer()).get(`/v1/grants/${saved.id}`).expect(200);

      expect(res.body.id).toBe(saved.id);
      expect(res.body.title).toBe(saved.title);
    });

    it('returns 404 when the grant ID does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app.getHttpServer()).get(`/v1/grants/${nonExistentId}`).expect(404);

      expect(res.body.message).toMatch(/not found/i);
    });

    it('returns 400 when the ID is not a valid UUID', async () => {
      await request(app.getHttpServer()).get('/v1/grants/not-a-uuid').expect(400);
    });
  });

  // ── PUT /v1/grants/:id ──────────────────────────────────────────────────────

  describe('PUT /v1/grants/:id', () => {
    it('updates grant title and returns 200', async () => {
      const saved = await grantsRepo.save(grantsRepo.create(makeGrantPayload()));

      const res = await request(app.getHttpServer())
        .put(`/v1/grants/${saved.id}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
    });

    it('updates grant status to under_review', async () => {
      const saved = await grantsRepo.save(grantsRepo.create(makeGrantPayload()));

      const res = await request(app.getHttpServer())
        .put(`/v1/grants/${saved.id}`)
        .send({ status: 'under_review', reviewerId: 'reviewer-uuid-1' })
        .expect(200);

      expect(res.body.status).toBe('under_review');
      expect(res.body.reviewerId).toBe('reviewer-uuid-1');
    });

    it('adds reviewer notes to the grant', async () => {
      const saved = await grantsRepo.save(grantsRepo.create(makeGrantPayload()));

      const res = await request(app.getHttpServer())
        .put(`/v1/grants/${saved.id}`)
        .send({ reviewNotes: 'Strong application, pending financial review.' })
        .expect(200);

      expect(res.body.reviewNotes).toBe('Strong application, pending financial review.');
    });

    it('returns 404 when the grant to update does not exist', async () => {
      await request(app.getHttpServer())
        .put('/v1/grants/00000000-0000-0000-0000-000000000000')
        .send({ title: 'Ghost update' })
        .expect(404);
    });

    it('returns 400 when the ID is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .put('/v1/grants/bad-id')
        .send({ title: 'anything' })
        .expect(400);
    });

    it('rejects an invalid status value with 400', async () => {
      const saved = await grantsRepo.save(grantsRepo.create(makeGrantPayload()));

      await request(app.getHttpServer())
        .put(`/v1/grants/${saved.id}`)
        .send({ status: 'totally_invalid_status' })
        .expect(400);
    });

    it('persists the update in the database', async () => {
      const saved = await grantsRepo.save(grantsRepo.create(makeGrantPayload()));

      await request(app.getHttpServer())
        .put(`/v1/grants/${saved.id}`)
        .send({ status: 'approved' })
        .expect(200);

      const fromDb = await grantsRepo.findOne({ where: { id: saved.id } });
      expect(fromDb?.status).toBe('approved');
    });
  });

  // ── DELETE /v1/grants/:id ───────────────────────────────────────────────────

  describe('DELETE /v1/grants/:id', () => {
    it('deletes an existing grant and returns 204', async () => {
      const saved = await grantsRepo.save(grantsRepo.create(makeGrantPayload()));

      await request(app.getHttpServer()).delete(`/v1/grants/${saved.id}`).expect(204);
    });

    it('removes the grant from the database after deletion', async () => {
      const saved = await grantsRepo.save(grantsRepo.create(makeGrantPayload()));

      await request(app.getHttpServer()).delete(`/v1/grants/${saved.id}`).expect(204);

      const fromDb = await grantsRepo.findOne({ where: { id: saved.id } });
      expect(fromDb).toBeNull();
    });

    it('returns 404 when the grant to delete does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/v1/grants/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('returns 400 when the ID is not a valid UUID', async () => {
      await request(app.getHttpServer()).delete('/v1/grants/not-a-uuid').expect(400);
    });

    it('cascades correctly — deleting a grant does not affect other grants', async () => {
      const grantA = await grantsRepo.save(
        grantsRepo.create(makeGrantPayload({ title: 'Keep Me' }))
      );
      const grantB = await grantsRepo.save(
        grantsRepo.create(makeGrantPayload({ title: 'Delete Me' }))
      );

      await request(app.getHttpServer()).delete(`/v1/grants/${grantB.id}`).expect(204);

      const remaining = await grantsRepo.find();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(grantA.id);
    });
  });

  // ── Authorization checks ────────────────────────────────────────────────────

  describe('Authorization', () => {
    it('allows the grant applicant to update their own grant', async () => {
      // The mock JWT guard sets user.id = 'test-user-id' which matches applicantId
      const saved = await grantsRepo.save(
        grantsRepo.create(makeGrantPayload({ applicantId: 'test-user-id' }))
      );

      const res = await request(app.getHttpServer())
        .put(`/v1/grants/${saved.id}`)
        .send({ title: 'Owner Updated Title' })
        .expect(200);

      expect(res.body.title).toBe('Owner Updated Title');
    });
  });
});
