import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationDto, buildPaginationMeta } from './pagination.dto';
import { PaginatedResponseDto } from './api-response.dto';

describe('PaginationDto', () => {
  function toDto(plain: Record<string, unknown>): PaginationDto {
    return plainToInstance(PaginationDto, plain);
  }

  it('should apply defaults when page and limit are omitted', () => {
    const dto = toDto({});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('should accept valid page and limit values', async () => {
    const dto = toDto({ page: 3, limit: 50 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(50);
  });

  it('should reject page < 1', async () => {
    const dto = toDto({ page: 0, limit: 20 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should reject limit < 1', async () => {
    const dto = toDto({ page: 1, limit: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('should reject limit > 100', async () => {
    const dto = toDto({ page: 1, limit: 101 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('should coerce numeric strings from query params', () => {
    const dto = toDto({ page: '2', limit: '15' });
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(15);
  });
});

describe('buildPaginationMeta', () => {
  it('should compute totalPages correctly', () => {
    const meta = buildPaginationMeta(1, 20, 55);
    expect(meta.totalPages).toBe(3); // ceil(55/20)
    expect(meta.total).toBe(55);
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(20);
  });

  it('should return 0 totalPages when total is 0', () => {
    const meta = buildPaginationMeta(1, 20, 0);
    expect(meta.totalPages).toBe(0);
  });

  it('should return 1 totalPage when total equals limit', () => {
    const meta = buildPaginationMeta(1, 20, 20);
    expect(meta.totalPages).toBe(1);
  });

  it('should handle limit of 0 without crashing', () => {
    const meta = buildPaginationMeta(1, 0, 50);
    expect(meta.totalPages).toBe(0);
  });
});

describe('PaginatedResponseDto', () => {
  it('should carry data and pagination metadata', () => {
    const dto = new PaginatedResponseDto(['a', 'b'], 200, 2, 10, 25);

    expect(dto.data).toEqual(['a', 'b']);
    expect(dto.statusCode).toBe(200);
    expect(dto.pagination).toMatchObject({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it('should set a valid ISO 8601 timestamp', () => {
    const dto = new PaginatedResponseDto([], 200, 1, 20, 0);
    expect(new Date(dto.timestamp).toISOString()).toBe(dto.timestamp);
  });
});
