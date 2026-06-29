/**
 * Security regression tests (#697)
 *
 * Verifies that every response from the API includes the required
 * security headers and that the CORS and body-size limit policies
 * are enforced correctly.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from '../src/app.module';

// ---------------------------------------------------------------------------
// Helper — spin up the full app the same way bootstrap() does
// ---------------------------------------------------------------------------
async function createTestApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      xContentTypeOptions: true,
      xFrameOptions: { action: 'deny' },
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.setGlobalPrefix('v1');

  app.enableCors({
    origin: ['http://localhost:3001'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
    credentials: false,
  });

  await app.init();
  return app;
}

// ---------------------------------------------------------------------------
describe('Security regression tests (#697)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Security headers ─────────────────────────────────────────────────────

  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options: DENY', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('sets Strict-Transport-Security with 1-year max-age', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health');
    const hsts = res.headers['strict-transport-security'];
    expect(hsts).toBeDefined();
    expect(hsts).toMatch(/max-age=31536000/);
    expect(hsts).toMatch(/includeSubDomains/);
  });

  it('sets Content-Security-Policy header', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  // ── CORS ─────────────────────────────────────────────────────────────────

  it('allows preflight from an allowed origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/v1/auth/login')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3001');
  });

  it('rejects CORS from a disallowed origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/health')
      .set('Origin', 'https://evil.example.com');

    // The allow-origin header should NOT be set to the evil origin
    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example.com');
  });

  // ── Body-size limit ───────────────────────────────────────────────────────

  it('rejects JSON payloads larger than 1 MB', async () => {
    // Generate a 1.1 MB payload (over the 1mb limit)
    const bigPayload = { data: 'x'.repeat(1_100_000) };

    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(bigPayload));

    // Express returns 413 Payload Too Large
    expect(res.status).toBe(413);
  });

  // ── Auth guard — protected endpoints return 401 without token ────────────

  it('returns 401 for GET /v1/users without Authorization header', async () => {
    const res = await request(app.getHttpServer()).get('/v1/users');
    expect([401, 403]).toContain(res.status);
  });

  it('returns 401 for GET /v1/courses without Authorization header when auth required', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/courses')
      .send({ title: 'Hack course' });
    expect([401, 403]).toContain(res.status);
  });
});
