import {
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function buildHost(url: string, statusMock: jest.Mock, jsonMock: jest.Mock) {
  statusMock.mockReturnValue({ json: jsonMock });
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue({ status: statusMock, json: jsonMock }),
      getRequest: jest.fn().mockReturnValue({ url }),
    }),
  } as any;
}

function run(exception: unknown, url = '/test') {
  const filter = new HttpExceptionFilter();
  const json = jest.fn();
  const status = jest.fn();
  filter.catch(exception, buildHost(url, status, json));
  return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] as any };
}

describe('HttpExceptionFilter', () => {
  it('handles NotFoundException (404)', () => {
    const { status, body } = run(new NotFoundException('Resource not found'));
    expect(status).toBe(404);
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('Resource not found');
    expect(body.path).toBe('/test');
    expect(body.timestamp).toBeDefined();
  });

  it('handles BadRequestException (400)', () => {
    const { status, body } = run(new BadRequestException('Bad input'));
    expect(status).toBe(400);
    expect(body.message).toBe('Bad input');
  });

  it('handles UnauthorizedException (401)', () => {
    const { status, body } = run(new UnauthorizedException());
    expect(status).toBe(401);
    expect(body.statusCode).toBe(401);
  });

  it('handles ForbiddenException (403)', () => {
    const { status, body } = run(new ForbiddenException('Forbidden'));
    expect(status).toBe(403);
    expect(body.message).toBe('Forbidden');
  });

  it('handles ConflictException (409)', () => {
    const { status, body } = run(new ConflictException('Already exists'));
    expect(status).toBe(409);
    expect(body.message).toBe('Already exists');
  });

  it('handles InternalServerErrorException (500)', () => {
    const { status, body } = run(new InternalServerErrorException('Unexpected'));
    expect(status).toBe(500);
    expect(body.message).toBe('Unexpected');
  });

  it('handles generic HttpException with custom status', () => {
    const { status, body } = run(new HttpException('Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE));
    expect(status).toBe(503);
    expect(body.statusCode).toBe(503);
  });

  it('extracts message from object response body', () => {
    const { body } = run(new HttpException({ message: 'Custom', error: 'Bad Request' }, 400));
    expect(body.message).toBe('Custom');
  });

  it('falls back to raw object when message key is absent', () => {
    const raw = { error: 'Something', code: 42 };
    const { body } = run(new HttpException(raw, 400));
    expect(body.message).toEqual(raw);
  });

  it('falls back to 500 for a plain Error', () => {
    const { status, body } = run(new Error('Raw error'));
    expect(status).toBe(500);
    expect(body.statusCode).toBe(500);
  });

  it('falls back to 500 for a thrown string', () => {
    const { status } = run('boom');
    expect(status).toBe(500);
  });

  it('includes the request path in the response body', () => {
    const { body } = run(new NotFoundException(), '/v1/certificates/abc');
    expect(body.path).toBe('/v1/certificates/abc');
  });

  it('always includes a valid ISO timestamp', () => {
    const { body } = run(new NotFoundException());
    expect(typeof body.timestamp).toBe('string');
    expect(() => new Date(body.timestamp)).not.toThrow();
  });
});
