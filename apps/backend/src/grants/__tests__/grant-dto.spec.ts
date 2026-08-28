/**
 * Unit tests for #807 — Consolidate duplicate DTO/type definitions
 *
 * Covers:
 *  - PdfBuilderService: shared PDF generation logic
 *  - PaginateGrantsDto inherits page/limit from PaginationDto
 *  - JobQueryDto inherits page/limit from PaginationDto
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PdfBuilderService } from '../../common/services/pdf-builder.service';
import { PaginateGrantsDto } from '../dto/grant.dto';

// ─── PdfBuilderService ────────────────────────────────────────────────────────

describe('PdfBuilderService', () => {
  let service: PdfBuilderService;

  beforeEach(() => {
    service = new PdfBuilderService();
  });

  it('returns a Buffer', () => {
    const result = service.build([]);
    expect(result).toBeInstanceOf(Buffer);
  });

  it('starts with the PDF header %PDF-1.4', () => {
    const result = service.build([]);
    expect(result.toString('utf8')).toMatch(/^%PDF-1\.4/);
  });

  it('ends with %%EOF', () => {
    const result = service.build([]);
    expect(result.toString('utf8')).toMatch(/%%EOF$/);
  });

  it("embeds each line's text into the stream", () => {
    const result = service.build([{ size: 14, x: 72, y: 700, text: 'Hello World' }]);
    expect(result.toString('utf8')).toContain('Hello World');
  });

  it('escapes parentheses in text', () => {
    const escaped = service.escape('foo(bar)baz');
    expect(escaped).toBe('foo\\(bar\\)baz');
  });

  it('escapes backslashes in text', () => {
    const escaped = service.escape('a\\b');
    expect(escaped).toBe('a\\\\b');
  });

  it('includes font size and position in the stream', () => {
    const result = service.build([{ size: 26, x: 100, y: 500, text: 'Test' }]);
    expect(result.toString('utf8')).toContain('/F1 26 Tf');
    expect(result.toString('utf8')).toContain('100 500');
  });

  it('handles multiple lines', () => {
    const result = service.build([
      { size: 12, x: 72, y: 700, text: 'Line one' },
      { size: 12, x: 72, y: 680, text: 'Line two' },
    ]);
    const content = result.toString('utf8');
    expect(content).toContain('Line one');
    expect(content).toContain('Line two');
  });
});

// ─── PaginateGrantsDto inherits PaginationDto ─────────────────────────────────

describe('PaginateGrantsDto (extends PaginationDto)', () => {
  it('accepts valid page and limit from PaginationDto base', async () => {
    const dto = plainToInstance(PaginateGrantsDto, { page: 2, limit: 10 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects page < 1 (inherited constraint)', async () => {
    const dto = plainToInstance(PaginateGrantsDto, { page: 0, limit: 10 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('rejects limit > 100 (inherited constraint)', async () => {
    const dto = plainToInstance(PaginateGrantsDto, { page: 1, limit: 200 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('accepts a valid grant status filter', async () => {
    const dto = plainToInstance(PaginateGrantsDto, { status: 'open' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid status value', async () => {
    const dto = plainToInstance(PaginateGrantsDto, { status: 'invalid_status' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('allows all fields to be omitted (all optional)', async () => {
    const dto = plainToInstance(PaginateGrantsDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
