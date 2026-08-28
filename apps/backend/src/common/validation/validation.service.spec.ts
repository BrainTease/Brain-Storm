/**
 * Unit tests for ValidationService — issue #806.
 *
 * Tests cover only the DTO-validation helpers that remain after removing the
 * redundant inline regex methods.  Domain-specific validation rules (email
 * format, Stellar key format, password strength, etc.) are tested through their
 * respective custom validators in custom.validators.ts and through DTO specs.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { IsString, MinLength, IsEmail, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ValidationService } from './validation.service';

// ── Fixture DTOs ──────────────────────────────────────────────────────────────

class UserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  name!: string;
}

class PartialUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

class PaginationDto {
  @IsInt()
  @Min(1)
  page!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  limit!: number;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ValidationService (#806)', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  // ── validateDto ────────────────────────────────────────────────────────────

  describe('validateDto', () => {
    it('returns typed instance for valid input', async () => {
      const result = await service.validateDto(UserDto, {
        email: 'alice@example.com',
        name: 'Alice',
      });
      expect(result).toBeInstanceOf(UserDto);
      expect(result.email).toBe('alice@example.com');
      expect(result.name).toBe('Alice');
    });

    it('throws BadRequestException for invalid email', async () => {
      await expect(
        service.validateDto(UserDto, { email: 'not-an-email', name: 'Alice' })
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when required field is missing', async () => {
      await expect(service.validateDto(UserDto, { email: 'alice@example.com' })).rejects.toThrow(
        BadRequestException
      );
    });

    it('error response includes the failing field name', async () => {
      try {
        await service.validateDto(UserDto, { email: 'bad', name: 'Alice' });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const body = (err as BadRequestException).getResponse() as Record<string, unknown>;
        expect(body).toHaveProperty('email');
      }
    });
  });

  // ── validateDtoSilent ──────────────────────────────────────────────────────

  describe('validateDtoSilent', () => {
    it('returns { valid: true } for valid input', async () => {
      const result = await service.validateDtoSilent(UserDto, {
        email: 'bob@example.com',
        name: 'Bob',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('returns { valid: false, errors } for invalid input', async () => {
      const result = await service.validateDtoSilent(UserDto, {
        email: 'not-valid',
        name: 'Bo',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  // ── validatePartialDto ─────────────────────────────────────────────────────

  describe('validatePartialDto', () => {
    it('passes with empty object (all fields optional)', async () => {
      const result = await service.validatePartialDto(PartialUserDto, {});
      expect(result).toBeDefined();
    });

    it('passes with a single valid field', async () => {
      const result = await service.validatePartialDto(PartialUserDto, { name: 'Charlie' });
      expect(result.name).toBe('Charlie');
    });

    it('throws when a provided field is invalid', async () => {
      await expect(
        service.validatePartialDto(PartialUserDto, { email: 'not-an-email' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── validateDtoArray ───────────────────────────────────────────────────────

  describe('validateDtoArray', () => {
    it('validates all valid items and returns typed instances', async () => {
      const items = [
        { page: 1, limit: 10 },
        { page: 2, limit: 20 },
      ];
      const results = await service.validateDtoArray(PaginationDto, items);
      expect(results).toHaveLength(2);
      expect(results[0].page).toBe(1);
    });

    it('throws with indexed path when one item is invalid', async () => {
      const items = [
        { page: 1, limit: 10 },
        { page: 0, limit: 10 }, // page must be >= 1
      ];
      try {
        await service.validateDtoArray(PaginationDto, items);
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const body = (err as BadRequestException).getResponse() as Record<string, unknown>;
        // Should reference the second item (index 1)
        const keys = Object.keys(body);
        expect(keys.some((k) => k.startsWith('[1]'))).toBe(true);
      }
    });

    it('returns empty array for empty input', async () => {
      const results = await service.validateDtoArray(PaginationDto, []);
      expect(results).toEqual([]);
    });
  });
});
