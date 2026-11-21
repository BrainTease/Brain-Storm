/**
 * Unit tests for ApiResponseDto / PaginatedResponseDto — issue #57
 *
 * Verifies the envelope shape and that Swagger @ApiProperty decorators
 * are present on every public field so the OpenAPI spec is complete.
 */
import 'reflect-metadata';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiResponseDto, PaginatedResponseDto } from './api-response.dto';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the swagger metadata array stored by @ApiProperty on a class */
function swaggerMeta(target: new (...args: any[]) => any): string[] {
  // NestJS Swagger stores metadata under DECORATORS_PREFIX
  const proto = target.prototype;
  const metadata: Record<string, any> =
    Reflect.getMetadata('swagger/apiModelPropertiesArray', proto) ?? [];
  return metadata as unknown as string[];
}

// ── ApiResponseDto ────────────────────────────────────────────────────────────

describe('ApiResponseDto', () => {
  it('populates data, statusCode, and timestamp in the constructor', () => {
    const dto = new ApiResponseDto({ id: 1 }, 200);

    expect(dto.data).toEqual({ id: 1 });
    expect(dto.statusCode).toBe(200);
    expect(typeof dto.timestamp).toBe('string');
    expect(new Date(dto.timestamp).getTime()).not.toBeNaN();
  });

  it('sets optional message when provided', () => {
    const dto = new ApiResponseDto(null, 201, 'Created');

    expect(dto.message).toBe('Created');
  });

  it('sets pagination metadata when provided', () => {
    const dto = new ApiResponseDto([], 200, undefined, {
      page: 2,
      limit: 10,
      total: 50,
      totalPages: 5,
    });

    expect(dto.pagination).toEqual({ page: 2, limit: 10, total: 50, totalPages: 5 });
  });

  it('leaves message and pagination undefined when not provided', () => {
    const dto = new ApiResponseDto({ x: 1 }, 200);

    expect(dto.message).toBeUndefined();
    expect(dto.pagination).toBeUndefined();
  });

  it('has @ApiProperty on required fields (data, statusCode, timestamp)', () => {
    const fields = swaggerMeta(ApiResponseDto);

    expect(fields).toContain(':data');
    expect(fields).toContain(':statusCode');
    expect(fields).toContain(':timestamp');
  });

  it('has @ApiPropertyOptional on optional fields (message, error, pagination)', () => {
    const fields = swaggerMeta(ApiResponseDto);

    expect(fields).toContain(':message');
    expect(fields).toContain(':error');
    expect(fields).toContain(':pagination');
  });
});

// ── PaginatedResponseDto ──────────────────────────────────────────────────────

describe('PaginatedResponseDto', () => {
  it('extends ApiResponseDto and builds correct pagination metadata', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const dto = new PaginatedResponseDto(items, 200, 1, 10, 25);

    expect(dto).toBeInstanceOf(ApiResponseDto);
    expect(dto.data).toEqual(items);
    expect(dto.statusCode).toBe(200);
    expect(dto.pagination).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 });
  });

  it('rounds up totalPages correctly', () => {
    const dto = new PaginatedResponseDto([], 200, 1, 10, 21);

    expect(dto.pagination!.totalPages).toBe(3);
  });
});
