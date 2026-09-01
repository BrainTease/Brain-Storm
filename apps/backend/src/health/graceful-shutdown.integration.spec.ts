import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GracefulShutdownService } from './graceful-shutdown.service';

/**
 * Graceful Shutdown Integration Tests
 *
 * Tests that the server properly drains in-flight requests and runs cleanup
 * handlers during shutdown, even when requests are still in-flight.
 *
 * All timing-based assertions use Jest fake timers so results are
 * deterministic and the suite completes in milliseconds.
 * process.exit is mocked so test teardown is not interrupted.
 */
describe('GracefulShutdownService Integration Tests', () => {
  let app: TestingModule;
  let shutdownService: GracefulShutdownService;
  let configService: ConfigService;
  let processExitSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Prevent tests from actually exiting the process
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);

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
    jest.useRealTimers();
    processExitSpy.mockRestore();
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
    jest.useFakeTimers();

    const cleanup = jest.fn(async () => {});

    shutdownService.registerCleanup(cleanup);

    // Put a request in flight so shutdown must wait before running cleanup
    shutdownService.trackRequest();

    // Start the shutdown – it will wait for drainResolve
    const shutdownPromise = shutdownService['shutdown']('SIGTERM');

    // Release the in-flight request — this triggers drainResolve
    shutdownService.releaseRequest();

    // Let all timers / microtasks (including cleanup async chain) run
    await jest.runAllTimersAsync();
    await shutdownPromise;

    expect(cleanup).toHaveBeenCalled();
    expect(shutdownService['inFlightCount']).toBe(0);
  });

  it('should drain in-flight requests before calling cleanup handlers', async () => {
    jest.useFakeTimers();

    const callOrder: string[] = [];
    const cleanup = jest.fn(async () => {
      callOrder.push('cleanup');
    });

    shutdownService.registerCleanup(cleanup);

    // Simulate slow requests that complete after 100ms and 200ms
    let requestFinished = false;
    shutdownService.trackRequest();
    shutdownService.trackRequest();

    // Schedule releases at fake t=100ms and t=200ms
    setTimeout(() => {
      shutdownService.releaseRequest();
    }, 100);

    setTimeout(() => {
      shutdownService.releaseRequest();
      requestFinished = true;
    }, 200);

    // Start shutdown while requests are in flight
    shutdownService['isShuttingDown'] = true;

    // Verify requests still in flight before any timers run
    expect(shutdownService['inFlightCount']).toBe(2);

    // Advance to just after the first release (100ms), second not yet done
    await jest.advanceTimersByTimeAsync(100);
    expect(shutdownService['inFlightCount']).toBe(1);

    // Advance to just after the second release (200ms)
    await jest.advanceTimersByTimeAsync(100);
    expect(requestFinished).toBe(true);
    expect(shutdownService['inFlightCount']).toBe(0);
  });

  it('should handle multiple cleanup handlers', async () => {
    jest.useFakeTimers();

    const cleanups: jest.Mock[] = [];
    for (let i = 0; i < 3; i++) {
      const cleanup = jest.fn(async () => {
        // Simulate some async work (10ms each)
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      });
      cleanups.push(cleanup);
      shutdownService.registerCleanup(cleanup);
    }

    shutdownService['isShuttingDown'] = true;

    const shutdownPromise = shutdownService['shutdown']('SIGTERM');

    // Let all timers / microtasks run
    await jest.runAllTimersAsync();
    await shutdownPromise;

    // All cleanup handlers should have been called
    cleanups.forEach((cleanup) => {
      expect(cleanup).toHaveBeenCalled();
    });
  });

  it('should continue even if a cleanup handler throws', async () => {
    jest.useFakeTimers();

    const cleanup1 = jest.fn(async () => {
      throw new Error('Cleanup failed');
    });
    const cleanup2 = jest.fn(async () => {
      // This should still be called
    });

    shutdownService.registerCleanup(cleanup1);
    shutdownService.registerCleanup(cleanup2);

    shutdownService['isShuttingDown'] = true;

    const shutdownPromise = shutdownService['shutdown']('SIGTERM');

    await jest.runAllTimersAsync();
    await shutdownPromise;

    expect(cleanup1).toHaveBeenCalled();
    expect(cleanup2).toHaveBeenCalled();
  });

  it('should drain timeout and force shutdown with in-flight requests', async () => {
    jest.useFakeTimers();

    // Use a fresh service with a short, predictable drain timeout (1000ms)
    @Injectable()
    class ShortTimeoutConfigService {
      get(key: string) {
        if (key === 'shutdown.drainTimeoutMs') return 1000;
        return null;
      }
    }

    const shortApp = await Test.createTestingModule({
      providers: [
        GracefulShutdownService,
        { provide: ConfigService, useClass: ShortTimeoutConfigService },
      ],
    }).compile();

    const svc = shortApp.get<GracefulShutdownService>(GracefulShutdownService);
    const cleanup = jest.fn(async () => {});

    svc.registerCleanup(cleanup);
    svc.trackRequest();
    svc.trackRequest();
    svc['isShuttingDown'] = true;

    // Start shutdown — requests are never released so timeout will fire
    const shutdownPromise = svc['shutdown']('SIGTERM');

    // Advance past the drain timeout (1000ms)
    await jest.advanceTimersByTimeAsync(1100);
    await shutdownPromise;

    // Cleanup should still run even after timeout
    expect(cleanup).toHaveBeenCalled();

    await shortApp.close();
  });
});
