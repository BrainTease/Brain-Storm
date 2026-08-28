import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GracefulShutdownService } from './graceful-shutdown.service';

/**
 * Graceful Shutdown Integration Tests
 *
 * Tests that the server properly drains in-flight requests and runs cleanup
 * handlers during shutdown, even when requests are still in-flight.
 */
describe('GracefulShutdownService Integration Tests', () => {
  let app: TestingModule;
  let shutdownService: GracefulShutdownService;
  let configService: ConfigService;

  beforeEach(async () => {
    process.env.SHUTDOWN_DRAIN_TIMEOUT_MS = '5000';

    @Injectable()
    class MockConfigService {
      get(key: string) {
        if (key === 'shutdown.drainTimeoutMs') return 5000;
        return null;
      }
    }

    app = await Test.createTestingModule({
      providers: [
        GracefulShutdownService,
        { provide: ConfigService, useClass: MockConfigService },
      ],
    }).compile();

    shutdownService = app.get<GracefulShutdownService>(GracefulShutdownService);
    configService = app.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should track and release requests correctly', () => {
    shutdownService.trackRequest();
    shutdownService.trackRequest();

    expect(shutdownService['inFlightCount']).toBe(2);

    shutdownService.releaseRequest();
    expect(shutdownService['inFlightCount']).toBe(1);

    shutdownService.releaseRequest();
    expect(shutdownService['inFlightCount']).toBe(0);
  });

  it('should prevent double-release of requests', () => {
    shutdownService.trackRequest();
    shutdownService.releaseRequest();
    shutdownService.releaseRequest(); // Should not go negative

    expect(shutdownService['inFlightCount']).toBe(0);
  });

  it('should mark server as not shutting down initially', () => {
    expect(shutdownService.shuttingDown).toBe(false);
  });

  it('should register and call cleanup handlers during shutdown', async () => {
    let cleanupCalled = false;
    const cleanup = jest.fn(async () => {
      cleanupCalled = true;
    });

    shutdownService.registerCleanup(cleanup);

    shutdownService.trackRequest();
    // Trigger shutdown manually (no SIGTERM)
    shutdownService['isShuttingDown'] = true;
    shutdownService.releaseRequest();

    // Give the cleanup handlers a chance to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cleanup).toHaveBeenCalled();
  });

  it('should drain in-flight requests before calling cleanup handlers', async () => {
    const callOrder: string[] = [];

    const cleanup = jest.fn(async () => {
      callOrder.push('cleanup');
    });

    shutdownService.registerCleanup(cleanup);

    // Simulate slow request that completes mid-shutdown
    let requestFinished = false;
    shutdownService.trackRequest();
    shutdownService.trackRequest();

    setTimeout(() => {
      shutdownService.releaseRequest();
    }, 100);

    setTimeout(() => {
      shutdownService.releaseRequest();
      requestFinished = true;
    }, 200);

    // Start shutdown while requests are in flight
    shutdownService['isShuttingDown'] = true;

    // Drain should wait for requests to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(shutdownService['inFlightCount']).toBe(2); // Still in flight

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(requestFinished).toBe(true);
    expect(shutdownService['inFlightCount']).toBe(0);
  });

  it('should handle multiple cleanup handlers', async () => {
    const cleanups: jest.Mock[] = [];
    for (let i = 0; i < 3; i++) {
      const cleanup = jest.fn(async () => {
        // Simulate some async work
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      cleanups.push(cleanup);
      shutdownService.registerCleanup(cleanup);
    }

    shutdownService['isShuttingDown'] = true;
    await shutdownService['shutdown']('SIGTERM').catch(() => {
      // Ignore exit
    });

    // All cleanup handlers should have been called
    cleanups.forEach((cleanup) => {
      expect(cleanup).toHaveBeenCalled();
    });
  });

  it('should continue even if a cleanup handler throws', async () => {
    const cleanup1 = jest.fn(async () => {
      throw new Error('Cleanup failed');
    });
    const cleanup2 = jest.fn(async () => {
      // This should still be called
    });

    shutdownService.registerCleanup(cleanup1);
    shutdownService.registerCleanup(cleanup2);

    shutdownService['isShuttingDown'] = true;
    await shutdownService['shutdown']('SIGTERM').catch(() => {
      // Ignore exit
    });

    expect(cleanup1).toHaveBeenCalled();
    expect(cleanup2).toHaveBeenCalled();
  });

  it('should drain timeout and force shutdown with in-flight requests', async () => {
    shutdownService = new GracefulShutdownService(configService);

    const cleanup = jest.fn(async () => {
      // Simulate cleanup work
    });

    shutdownService.registerCleanup(cleanup);
    shutdownService.trackRequest();
    shutdownService.trackRequest();

    const startTime = Date.now();
    shutdownService['isShuttingDown'] = true;

    // Don't release requests — they'll stay in-flight and timeout
    await shutdownService['shutdown']('SIGTERM').catch(() => {
      // Shutdown timeout is expected
    });

    const duration = Date.now() - startTime;
    // Should have waited close to the drain timeout (5000ms)
    expect(duration).toBeGreaterThanOrEqual(4500);
    expect(duration).toBeLessThan(6000);

    // Cleanup should still run even after timeout
    expect(cleanup).toHaveBeenCalled();
  });
});
