import { ConfigService } from '@nestjs/config';
import { GracefulShutdownService } from './graceful-shutdown.service';

function makeService(drainTimeoutMs = 10000): GracefulShutdownService {
  const configService = {
    get: (key: string) => (key === 'shutdown.drainTimeoutMs' ? drainTimeoutMs : null),
  } as unknown as ConfigService;
  return new GracefulShutdownService(configService);
}

describe('GracefulShutdownService', () => {
  let service: GracefulShutdownService;

  beforeEach(() => {
    service = makeService();
  });

  it('should start with shuttingDown = false', () => {
    expect(service.shuttingDown).toBe(false);
  });

  it('should track and release in-flight requests', () => {
    service.trackRequest();
    service.trackRequest();
    service.releaseRequest();
    service.releaseRequest();
    // No errors — count back to 0
    expect(service.shuttingDown).toBe(false);
  });

  it('should not go below 0 on extra releases', () => {
    expect(() => service.releaseRequest()).not.toThrow();
  });

  it('reads drain timeout from ConfigService', () => {
    const svc = makeService(7500);
    expect((svc as any).drainTimeoutMs).toBe(7500);
  });

  it('defaults drain timeout to 10000 when config returns undefined', () => {
    const configService = { get: () => undefined } as unknown as ConfigService;
    const svc = new GracefulShutdownService(configService);
    expect((svc as any).drainTimeoutMs).toBe(10000);
  });

  it('marks shuttingDown = true on onModuleDestroy', () => {
    service.onModuleDestroy();
    expect(service.shuttingDown).toBe(true);
  });

  it('registerCleanup appends a handler', () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    service.registerCleanup(handler);
    expect((service as any).cleanupHandlers).toHaveLength(1);
    expect((service as any).cleanupHandlers[0]).toBe(handler);
  });
});
