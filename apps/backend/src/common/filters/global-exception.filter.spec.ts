import { HttpStatus, Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import {
  AppError,
  ErrorCode,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  StellarError,
  DatabaseError,
} from '../errors/app.error';

function buildHost(statusMock: jest.Mock, jsonMock: jest.Mock) {
  statusMock.mockReturnValue({ json: jsonMock });
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue({ status: statusMock, json: jsonMock }),
    }),
  } as any;
}

function run(exception: unknown) {
  const filter = new GlobalExceptionFilter();
  const json = jest.fn();
  const status = jest.fn();
  filter.catch(exception, buildHost(status, json));
  return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] as any };
}

describe('GlobalExceptionFilter', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it('handles AppError with correct status, code and message', () => {
    const { status, body } = run(new AppError(ErrorCode.CONFLICT, 'Duplicate', 409));
    expect(status).toBe(409);
    expect(body.code).toBe(ErrorCode.CONFLICT);
    expect(body.message).toBe('Duplicate');
  });

  it('includes details when AppError has them', () => {
    const details = { field: 'email' };
    const { body } = run(
      new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed', 400, details)
    );
    expect(body.details).toEqual(details);
  });

  it('omits details key when AppError has none', () => {
    const { body } = run(new AppError(ErrorCode.NOT_FOUND, 'Not found', 404));
    expect(body).not.toHaveProperty('details');
  });

  it('handles ValidationError (400)', () => {
    const { status, body } = run(new ValidationError('Email required', { field: 'email' }));
    expect(status).toBe(400);
    expect(body.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(body.details).toEqual({ field: 'email' });
  });

  it('handles AuthenticationError (401)', () => {
    const { status, body } = run(new AuthenticationError('Bad credentials'));
    expect(status).toBe(401);
    expect(body.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
  });

  it('handles AuthorizationError (403)', () => {
    const { status, body } = run(new AuthorizationError('Access denied'));
    expect(status).toBe(403);
    expect(body.code).toBe(ErrorCode.AUTHORIZATION_ERROR);
  });

  it('handles NotFoundError (404)', () => {
    const { status, body } = run(new NotFoundError('Certificate'));
    expect(status).toBe(404);
    expect(body.code).toBe(ErrorCode.NOT_FOUND);
    expect(body.message).toBe('Certificate not found');
  });

  it('handles ConflictError (409)', () => {
    const { status, body } = run(new ConflictError('Already exists'));
    expect(status).toBe(409);
    expect(body.code).toBe(ErrorCode.CONFLICT);
  });

  it('handles StellarError (500) with details', () => {
    const { status, body } = run(new StellarError('Horizon unreachable', { txId: 'abc' }));
    expect(status).toBe(500);
    expect(body.code).toBe(ErrorCode.STELLAR_ERROR);
    expect(body.details).toEqual({ txId: 'abc' });
  });

  it('handles DatabaseError (500)', () => {
    const { status, body } = run(new DatabaseError('Connection refused'));
    expect(status).toBe(500);
    expect(body.code).toBe(ErrorCode.DATABASE_ERROR);
  });

  it('handles a plain Error with 500 and INTERNAL_ERROR code', () => {
    const { status, body } = run(new Error('Crash'));
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Crash');
  });

  it('handles a thrown string as 500 with generic message', () => {
    const { status, body } = run('oops' as unknown as Error);
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.message).toBe('Internal server error');
  });

  it('handles thrown null as 500', () => {
    const { status } = run(null);
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('handles thrown plain objects as 500', () => {
    const { status, body } = run({ weirdError: true });
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.message).toBe('Internal server error');
  });

  it('always includes a valid ISO timestamp', () => {
    const { body } = run(new Error('ts'));
    expect(typeof body.timestamp).toBe('string');
    expect(() => new Date(body.timestamp)).not.toThrow();
  });
});
