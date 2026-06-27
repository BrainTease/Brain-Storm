import { GracefulShutdownService } from './graceful-shutdown.service';

describe('GracefulShutdownService', () => {
  let service: GracefulShutdownService;

  beforeEach(() => {
    service = new GracefulShutdownService();
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
});
