import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { IdempotencyMiddleware } from './idempotency.middleware';

const mockCache = () => ({ get: jest.fn(), set: jest.fn() });

function buildRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('IdempotencyMiddleware', () => {
  let middleware: IdempotencyMiddleware;
  let cache: ReturnType<typeof mockCache>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IdempotencyMiddleware,
        { provide: CACHE_MANAGER, useFactory: mockCache },
      ],
    }).compile();
    middleware = module.get(IdempotencyMiddleware);
    cache = module.get(CACHE_MANAGER);
  });

  it('passes through when no Idempotency-Key header', async () => {
    const req: any = { headers: {} };
    const res = buildRes();
    const next = jest.fn();
    await middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('replays cached response', async () => {
    cache.get.mockResolvedValue({ status: 200, body: { data: 'ok' } });
    const req: any = { headers: { 'idempotency-key': 'key-1' } };
    const res = buildRes();
    const next = jest.fn();
    await middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: 'ok' });
    expect(next).not.toHaveBeenCalled();
  });

  it('stores response on first call', async () => {
    cache.get.mockResolvedValue(null);
    const req: any = { headers: { 'idempotency-key': 'key-2' } };
    const res = buildRes();
    const next = jest.fn();
    await middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
    // Simulate response
    res.json({ result: 'created' });
    expect(cache.set).toHaveBeenCalledWith(
      'idempotency:key-2',
      { status: 200, body: { result: 'created' } },
      86400,
    );
  });
});
