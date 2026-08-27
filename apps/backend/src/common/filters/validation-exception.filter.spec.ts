import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ValidationExceptionFilter } from './validation-exception.filter';

function buildHost(statusMock: jest.Mock, jsonMock: jest.Mock) {
  statusMock.mockReturnValue({ json: jsonMock });
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue({ status: statusMock, json: jsonMock }),
    }),
  } as any;
}

function run(exception: BadRequestException) {
  const filter = new ValidationExceptionFilter();
  const json = jest.fn();
  const status = jest.fn();
  filter.catch(exception, buildHost(status, json));
  return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] as any };
}

describe('ValidationExceptionFilter', () => {
  it('always responds with HTTP 400', () => {
    const { status } = run(new BadRequestException('Bad input'));
    expect(status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('includes statusCode 400 in the response body', () => {
    const { body } = run(new BadRequestException('Bad input'));
    expect(body.statusCode).toBe(400);
  });

  it('extracts message from a plain string exception', () => {
    const { body } = run(new BadRequestException('Email is required'));
    expect(body.message).toBe('Email is required');
  });

  it('extracts message from an object response body', () => {
    const { body } = run(new BadRequestException({ message: 'Validation failed', errors: ['x'] }));
    expect(body.message).toBe('Validation failed');
  });

  it('falls back to "Bad Request" when message key is missing from response object', () => {
    const { body } = run(new BadRequestException({ error: 'some error' }));
    expect(body.message).toBe('Bad Request');
  });

  it('exposes errors array when present', () => {
    const errors = ['email must not be empty', 'password too short'];
    const { body } = run(new BadRequestException({ message: 'Validation failed', errors }));
    expect(body.errors).toEqual(errors);
  });

  it('exposes the error key as errors when the array key is absent', () => {
    const { body } = run(
      new BadRequestException({ message: 'Validation failed', error: 'Bad Request' })
    );
    expect(body.errors).toBe('Bad Request');
  });

  it('sets errors to null when neither errors nor error key exists', () => {
    const { body } = run(new BadRequestException({ message: 'Minimal error' }));
    expect(body.errors).toBeNull();
  });

  it('handles NestJS class-validator response shape', () => {
    const exception = new BadRequestException({
      message: ['userId must be a UUID', 'courseId must be a UUID'],
      error: 'Bad Request',
      statusCode: 400,
    });
    const { status, body } = run(exception);
    expect(status).toBe(400);
    expect(body.message).toEqual(['userId must be a UUID', 'courseId must be a UUID']);
    expect(body.errors).toBe('Bad Request');
  });

  it('always includes a valid ISO timestamp', () => {
    const { body } = run(new BadRequestException('ts-test'));
    expect(typeof body.timestamp).toBe('string');
    expect(() => new Date(body.timestamp)).not.toThrow();
  });
});
