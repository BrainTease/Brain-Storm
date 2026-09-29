/**
 * Integration test for correlation IDs (#1215).
 *
 * Boots a minimal Nest app with the CorrelationMiddleware + a test
 * controller, sends requests, and asserts that the ID is:
 *   - echoed back on the response header
 *   - visible via getCorrelationId() inside the handler
 *   - preserved across an `await` boundary (AsyncLocalStorage still bound)
 */
import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CorrelationMiddleware, CORRELATION_HEADER } from './correlation.middleware';
import { getCorrelationId, runWithCorrelationId } from './correlation.store';

@Controller('test-correlation')
class TestController {
  @Get()
  async get() {
    const before = getCorrelationId();
    await new Promise((r) => setTimeout(r, 5));
    const after = getCorrelationId();
    return { before, after };
  }
}

@Module({ controllers: [TestController] })
class TestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}

describe('CorrelationMiddleware (#1215)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [TestModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates a UUID when no header is provided', async () => {
    const res = await request(app.getHttpServer()).get('/test-correlation').expect(200);
    const header = res.headers[CORRELATION_HEADER];
    expect(header).toMatch(/^[0-9a-f-]{36}$/i);
    expect(res.body.before).toBe(header);
    expect(res.body.after).toBe(header);
  });

  it('propagates an inbound X-Correlation-ID', async () => {
    const cid = 'test-cid-12345678';
    const res = await request(app.getHttpServer())
      .get('/test-correlation')
      .set('X-Correlation-ID', cid)
      .expect(200);
    expect(res.headers[CORRELATION_HEADER]).toBe(cid);
    expect(res.body.before).toBe(cid);
    expect(res.body.after).toBe(cid);
  });

  it('falls back to X-Request-ID', async () => {
    const rid = 'req-abc-xyz';
    const res = await request(app.getHttpServer())
      .get('/test-correlation')
      .set('X-Request-ID', rid)
      .expect(200);
    expect(res.headers[CORRELATION_HEADER]).toBe(rid);
    expect(res.body.before).toBe(rid);
  });

  it('runWithCorrelationId binds inside a manual async context', async () => {
    await runWithCorrelationId('manual-cid', async () => {
      expect(getCorrelationId()).toBe('manual-cid');
      await new Promise((r) => setTimeout(r, 1));
      expect(getCorrelationId()).toBe('manual-cid');
    });
  });
});
