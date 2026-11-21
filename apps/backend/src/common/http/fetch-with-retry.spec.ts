/**
 * Unit tests for fetchWithRetry — issue #59
 *
 * Uses Jest fake timers so backoff delays resolve instantly,
 * and mocks global `fetch` to avoid real network calls.
 */
import { fetchWithRetry } from './fetch-with-retry';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResponse(status: number, body = ''): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve({}),
  } as unknown as Response;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('fetchWithRetry', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('returns the response on first success', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200));

    const promise = fetchWithRetry('https://example.com', {}, { maxRetries: 2, retryBaseDelayMs: 100 });
    await jest.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 503 and returns the successful response', async () => {
    fetchMock
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeResponse(200));

    const promise = fetchWithRetry('https://example.com', {}, { maxRetries: 2, retryBaseDelayMs: 50 });
    await jest.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on network error and returns the successful response', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(makeResponse(200));

    const promise = fetchWithRetry('https://example.com', {}, { maxRetries: 2, retryBaseDelayMs: 50 });
    await jest.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries on repeated network errors', async () => {
    const err = new Error('ECONNRESET');
    fetchMock.mockRejectedValue(err);

    const promise = fetchWithRetry('https://example.com', {}, { maxRetries: 2, retryBaseDelayMs: 50 });
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow('ECONNRESET');
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('throws after exhausting all retries on repeated 500 responses', async () => {
    fetchMock.mockResolvedValue(makeResponse(500));

    const promise = fetchWithRetry('https://example.com', {}, { maxRetries: 2, retryBaseDelayMs: 50 });
    await jest.runAllTimersAsync();
    const res = await promise;

    // Last attempt returns the 500 response (not thrown for HTTP errors)
    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry 400 Bad Request', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(400));

    const promise = fetchWithRetry('https://example.com', {}, { maxRetries: 3, retryBaseDelayMs: 50 });
    await jest.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('applies timeout via AbortSignal', async () => {
    fetchMock.mockImplementation((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        (init as any).signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });

    const promise = fetchWithRetry('https://example.com', {}, {
      timeoutMs: 100,
      maxRetries: 0,
      retryBaseDelayMs: 50,
    });
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses default options when none are provided', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200));

    const promise = fetchWithRetry('https://example.com', {});
    await jest.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
  });
});
