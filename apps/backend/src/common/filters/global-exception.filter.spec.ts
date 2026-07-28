import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
} from '../errors/app.error';

/** Build a minimal ArgumentsHost mock */
function buildHost(url = '/v1/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const getResponse = jest.fn().mockReturnValue({ status });
  const getRequest = jest.fn().mockReturnValue({ url });
  const switchToHttp = jest.fn().mockReturnValue({ getResponse, getRequest });
  return { switchToHttp } as unknown as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    // Suppress logger output during tests
    jest.spyOn((filter as any).logger, 'warn').mockImplementation(() => {});
    jest.spyOn((filter as any).logger, 'error').mockImplementation(() => {});
    jest.spyOn((filter as any).logger, 'debug').mockImplementation(() => {});
  });

  function getJsonBody(host: ArgumentsHost): Record<string, unknown> {
    const http = host.switchToHttp();
    const res = http.getResponse<any>();
    return res.status.mock.results[0].value.json.mock.calls[0][0] as Record<string, unknown>;
  }

  // ── AppError subclasses ──────────────────────────────────────────────────

  it('should handle AppError with correct statusCode, code and message', () => {
    const host = buildHost();
    const err = new NotFoundError('Course');
    filter.catch(err, host);

    const body = getJsonBody(host);
    expect(body.statusCode).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toContain('Course');
    expect(body.path).toBe('/v1/test');
    expect(body.timestamp).toBeDefined();
  });

  it('should handle ValidationError (AppError subclass) with details', () => {
    const host = buildHost();
    const err = new ValidationError('Invalid input', { field: 'email' });
    filter.catch(err, host);

    const body = getJsonBody(host);
    expect(body.statusCode).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toEqual({ field: 'email' });
  });

  it('should handle AuthenticationError', () => {
    const host = buildHost();
    const err = new AuthenticationError();
    filter.catch(err, host);

    const body = getJsonBody(host);
    expect(body.statusCode).toBe(401);
    expect(body.code).toBe('AUTHENTICATION_ERROR');
  });

  // ── BadRequestException ───────────────────────────────────────────────────

  it('should handle BadRequestException with array validation errors', () => {
    const host = buildHost();
    const err = new BadRequestException({ message: ['email must be valid'], error: 'Bad Request' });
    filter.catch(err, host);

    const body = getJsonBody(host);
    expect(body.statusCode).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.errors).toEqual(['email must be valid']);
  });

  it('should handle BadRequestException with string message', () => {
    const host = buildHost();
    const err = new BadRequestException('Bad request');
    filter.catch(err, host);

    const body = getJsonBody(host);
    expect(body.statusCode).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  // ── Generic HttpException ─────────────────────────────────────────────────

  it('should handle NotFoundException (HttpException) correctly', () => {
    const host = buildHost();
    const err = new NotFoundException('User not found');
    filter.catch(err, host);

    const body = getJsonBody(host);
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('User not found');
  });

  it('should handle ForbiddenException', () => {
    const host = buildHost();
    const err = new ForbiddenException('Access denied');
    filter.catch(err, host);

    const body = getJsonBody(host);
    expect(body.statusCode).toBe(403);
  });

  it('should handle generic HttpException with object body', () => {
    const host = buildHost();
    const err = new HttpException({ message: 'Custom error', error: 'Custom' }, HttpStatus.CONFLICT);
    filter.catch(err, host);

    const body = getJsonBody(host);
    expect(body.statusCode).toBe(409);
    expect(body.message).toBe('Custom error');
  });

  // ── Unknown / generic Error ───────────────────────────────────────────────

  it('should handle generic Error with 500 status', () => {
    const host = buildHost();
    filter.catch(new Error('Unexpected failure'), host);

    const body = getJsonBody(host);
    expect(body.statusCode).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('should handle non-Error unknown throw', () => {
    const host = buildHost();
    filter.catch('some string error', host);

    const body = getJsonBody(host);
    expect(body.statusCode).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  // ── Response shape invariants ─────────────────────────────────────────────

  it('every response should always include statusCode, code, message, timestamp, path', () => {
    const cases: unknown[] = [
      new NotFoundError('X'),
      new BadRequestException('bad'),
      new NotFoundException('not found'),
      new Error('oops'),
    ];

    for (const err of cases) {
      const host = buildHost('/v1/check');
      filter.catch(err, host);
      const body = getJsonBody(host);

      expect(typeof body.statusCode).toBe('number');
      expect(typeof body.code).toBe('string');
      expect(typeof body.message).toBe('string');
      expect(typeof body.timestamp).toBe('string');
      expect(body.path).toBe('/v1/check');
    }
  });
});
