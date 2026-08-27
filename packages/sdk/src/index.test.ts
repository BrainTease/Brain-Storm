import { BrainStormClient } from './index';

/**
 * Unit tests for the Brain-Storm SDK's HTTP-adapter behaviour and all five
 * resource clients.
 *
 * `packages/sdk` is deliberately dependency-free (see the module doc comment
 * in `src/index.ts`), so these tests mock the global `fetch` directly with a
 * minimal `{ ok, status, statusText, json }` object rather than pulling in a
 * fetch polyfill.
 */

const BASE_URL = 'https://api.example.com';

type FakeResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: jest.Mock;
};

function fakeOkResponse(body: unknown, status = 200, statusText = 'OK'): FakeResponse {
  return { ok: true, status, statusText, json: jest.fn().mockResolvedValue(body) };
}

function fakeErrorResponse(status: number, statusText: string, jsonImpl: jest.Mock): FakeResponse {
  return { ok: false, status, statusText, json: jsonImpl };
}

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = fetchMock;
});

function lastCall() {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: call[0] as string, options: call[1] as RequestInit };
}

describe('BrainStormClient construction', () => {
  it('exposes all five resource namespaces', () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    expect(client.auth).toBeDefined();
    expect(client.courses).toBeDefined();
    expect(client.progress).toBeDefined();
    expect(client.users).toBeDefined();
    expect(client.stellar).toBeDefined();
  });
});

describe('baseURL assembly', () => {
  it('prefixes requests with baseURL + versioned path, with no double /v1 and no missing slash', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    fetchMock.mockResolvedValueOnce(fakeOkResponse({ data: [], total: 0, page: 1, limit: 20 }));

    await client.courses.list();

    const { url } = lastCall();
    expect(url).toBe('https://api.example.com/v1/courses');
  });
});

describe('client.auth', () => {
  it('register() POSTs to /v1/auth/register with the DTO body and returns the parsed response', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const dto = { email: 'new@example.com', password: 'hunter2' };
    const responseBody = { access_token: 'access-1', refresh_token: 'refresh-1' };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(responseBody));

    const result = await client.auth.register(dto);

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/auth/register`);
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify(dto));
    expect(result).toEqual(responseBody);
  });

  it('login() POSTs to /v1/auth/login with the DTO body', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const dto = { email: 'user@example.com', password: 'secret' };
    const responseBody = { access_token: 'access-2', refresh_token: 'refresh-2' };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(responseBody));

    const result = await client.auth.login(dto);

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/auth/login`);
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify(dto));
    expect(result).toEqual(responseBody);
  });

  it('logout() POSTs to /v1/auth/logout with { refresh_token }', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    fetchMock.mockResolvedValueOnce(fakeOkResponse(undefined));

    await client.auth.logout('my-refresh-token');

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/auth/logout`);
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ refresh_token: 'my-refresh-token' }));
  });
});

describe('client.courses', () => {
  it('list() with no params GETs /v1/courses with no query string', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const responseBody = { data: [], total: 0, page: 1, limit: 20 };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(responseBody));

    const result = await client.courses.list();

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/courses`);
    expect(options.method).toBe('GET');
    expect(result).toEqual(responseBody);
  });

  it('list(params) builds a query string: numbers are stringified and undefined fields are dropped', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    fetchMock.mockResolvedValueOnce(fakeOkResponse({ data: [], total: 0, page: 2, limit: 20 }));

    await client.courses.list({ search: 'blockchain', page: 2, limit: undefined });

    const { url } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/courses?search=blockchain&page=2`);
    expect(url).not.toContain('undefined');
  });

  it('list(params) stringifies purely numeric params correctly', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    fetchMock.mockResolvedValueOnce(fakeOkResponse({ data: [], total: 0, page: 3, limit: 10 }));

    await client.courses.list({ page: 3, limit: 10 });

    const { url } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/courses?page=3&limit=10`);
  });

  it('get(id) GETs /v1/courses/:id', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const course = { id: 'course-1', title: 'Intro', description: 'd', level: 'beginner', isPublished: true, requiresKyc: false, createdAt: '2026-01-01T00:00:00.000Z' };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(course));

    const result = await client.courses.get('course-1');

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/courses/course-1`);
    expect(options.method).toBe('GET');
    expect(result).toEqual(course);
  });

  it('create(dto) POSTs to /v1/courses', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const dto = { title: 'New course', description: 'desc' };
    const created = { id: 'course-2', ...dto, level: 'beginner', isPublished: false, requiresKyc: false, createdAt: '2026-01-01T00:00:00.000Z' };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(created));

    const result = await client.courses.create(dto);

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/courses`);
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify(dto));
    expect(result).toEqual(created);
  });

  it('update(id, dto) PATCHes /v1/courses/:id', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const dto = { title: 'Updated title' };
    const updated = { id: 'course-3', title: 'Updated title', description: 'd', level: 'beginner', isPublished: true, requiresKyc: false, createdAt: '2026-01-01T00:00:00.000Z' };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(updated));

    const result = await client.courses.update('course-3', dto);

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/courses/course-3`);
    expect(options.method).toBe('PATCH');
    expect(options.body).toBe(JSON.stringify(dto));
    expect(result).toEqual(updated);
  });

  it('remove(id) DELETEs /v1/courses/:id', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    fetchMock.mockResolvedValueOnce(fakeOkResponse(undefined));

    await client.courses.remove('course-4');

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/courses/course-4`);
    expect(options.method).toBe('DELETE');
  });
});

describe('client.progress', () => {
  it('record(dto) POSTs to /v1/progress', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const dto = { courseId: 'course-1', progressPct: 75 };
    const stored = { id: 'p-1', userId: 'u-1', courseId: 'course-1', progressPct: 75, updatedAt: '2026-01-01T00:00:00.000Z' };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(stored));

    const result = await client.progress.record(dto);

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/progress`);
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify(dto));
    expect(result).toEqual(stored);
  });

  it('getMyCourseProgress(id) GETs /v1/progress/my/:id', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const progress = { id: 'p-2', userId: 'u-1', courseId: 'course-9', progressPct: 40, updatedAt: '2026-01-01T00:00:00.000Z' };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(progress));

    const result = await client.progress.getMyCourseProgress('course-9');

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/progress/my/course-9`);
    expect(options.method).toBe('GET');
    expect(result).toEqual(progress);
  });
});

describe('client.users', () => {
  it('getProfile(id) GETs /v1/users/:id', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const user = { id: 'u-1', email: 'u@example.com', role: 'student', isVerified: true, createdAt: '2026-01-01T00:00:00.000Z' };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(user));

    const result = await client.users.getProfile('u-1');

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/users/u-1`);
    expect(options.method).toBe('GET');
    expect(result).toEqual(user);
  });

  it('updateProfile(id, dto) PATCHes /v1/users/:id', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const dto = { username: 'newname', bio: 'hi' };
    const updated = { id: 'u-1', email: 'u@example.com', role: 'student', isVerified: true, createdAt: '2026-01-01T00:00:00.000Z', ...dto };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(updated));

    const result = await client.users.updateProfile('u-1', dto);

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/users/u-1`);
    expect(options.method).toBe('PATCH');
    expect(options.body).toBe(JSON.stringify(dto));
    expect(result).toEqual(updated);
  });
});

describe('client.stellar', () => {
  it('getBalance(publicKey) GETs /v1/stellar/balance/:publicKey', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const balances = { balances: [{ asset_type: 'native', balance: '100.0000000' }] };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(balances));

    const result = await client.stellar.getBalance('GABC123');

    const { url, options } = lastCall();
    expect(url).toBe(`${BASE_URL}/v1/stellar/balance/GABC123`);
    expect(options.method).toBe('GET');
    expect(result).toEqual(balances);
  });
});

describe('headers and bearer token', () => {
  it('always sends Content-Type: application/json', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    fetchMock.mockResolvedValueOnce(fakeOkResponse({ data: [], total: 0, page: 1, limit: 20 }));

    await client.courses.list();

    const { options } = lastCall();
    const headers = options.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('does not send an Authorization header before setToken() is called', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    fetchMock.mockResolvedValueOnce(fakeOkResponse({ data: [], total: 0, page: 1, limit: 20 }));

    await client.courses.list();

    const { options } = lastCall();
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('sends Authorization: Bearer <token> once setToken() has been called', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    client.setToken('jwt-abc');
    fetchMock.mockResolvedValueOnce(fakeOkResponse({ data: [], total: 0, page: 1, limit: 20 }));

    await client.courses.list();

    const { options } = lastCall();
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer jwt-abc');
  });

  it('sends Authorization: Bearer <token> when the token is passed via constructor options', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL, token: 'ctor-token' });
    fetchMock.mockResolvedValueOnce(fakeOkResponse({ data: [], total: 0, page: 1, limit: 20 }));

    await client.courses.list();

    const { options } = lastCall();
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer ctor-token');
  });

  it('setToken() updates the token used by every resource namespace, not just one', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    client.setToken('shared-token');

    fetchMock.mockResolvedValueOnce(fakeOkResponse(undefined));
    await client.auth.logout('some-refresh-token');
    const authHeaders = lastCall().options.headers as Record<string, string>;
    expect(authHeaders['Authorization']).toBe('Bearer shared-token');

    fetchMock.mockResolvedValueOnce(fakeOkResponse({ data: [], total: 0, page: 1, limit: 20 }));
    await client.courses.list();
    const coursesHeaders = lastCall().options.headers as Record<string, string>;
    expect(coursesHeaders['Authorization']).toBe('Bearer shared-token');
  });
});

describe('error handling', () => {
  it('throws an Error whose message is ApiError.message, with statusCode/error assigned onto it, for a JSON error body', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const apiError = { statusCode: 404, message: 'Course not found', error: 'Not Found' };
    fetchMock.mockResolvedValueOnce(
      fakeErrorResponse(404, 'Not Found', jest.fn().mockResolvedValue(apiError)),
    );

    expect.assertions(4);
    try {
      await client.courses.get('missing-id');
    } catch (e) {
      const err = e as Error & { statusCode?: number; error?: string };
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Course not found');
      expect(err.statusCode).toBe(404);
      expect(err.error).toBe('Not Found');
    }
  });

  it('falls back to {statusCode, message: statusText} when the error body is not valid JSON, and still throws', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    fetchMock.mockResolvedValueOnce(
      fakeErrorResponse(500, 'Internal Server Error', jest.fn().mockRejectedValue(new Error('unexpected token'))),
    );

    expect.assertions(3);
    try {
      await client.courses.get('any-id');
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Internal Server Error');
      expect(err.statusCode).toBe(500);
    }
  });

  it('resolves with the parsed JSON body, unmodified, on a successful response', async () => {
    const client = new BrainStormClient({ baseURL: BASE_URL });
    const body = { id: 'u-1', email: 'u@example.com', role: 'student', isVerified: true, createdAt: '2026-01-01T00:00:00.000Z' };
    fetchMock.mockResolvedValueOnce(fakeOkResponse(body));

    const result = await client.users.getProfile('u-1');

    expect(result).toEqual(body);
  });
});
