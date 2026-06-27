import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import { BadRequestException } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';

class TestDto {
  @IsString()
  @MinLength(3)
  name: string;
}

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  describe('validateDto', () => {
    it('should validate valid DTO', async () => {
      const result = await service.validateDto(TestDto, { name: 'John' });
      expect(result.name).toBe('John');
    });

    it('should throw on invalid DTO', async () => {
      await expect(service.validateDto(TestDto, { name: 'Jo' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateDtoSilent', () => {
    it('should return valid true for valid DTO', async () => {
      const result = await service.validateDtoSilent(TestDto, { name: 'John' });
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return valid false for invalid DTO', async () => {
      const result = await service.validateDtoSilent(TestDto, { name: 'Jo' });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('isValidEmail', () => {
    it('should validate valid emails', () => {
      expect(service.isValidEmail('test@example.com')).toBe(true);
      expect(service.isValidEmail('user+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(service.isValidEmail('invalid-email')).toBe(false);
      expect(service.isValidEmail('test@')).toBe(false);
      expect(service.isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidStellarPublicKey', () => {
    it('should validate valid Stellar public keys', () => {
      expect(service.isValidStellarPublicKey('GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJJBBQ2EIISQE2BNXQ5BNRQ5')).toBe(true);
    });

    it('should reject invalid Stellar public keys', () => {
      expect(service.isValidStellarPublicKey('invalid-key')).toBe(false);
      expect(service.isValidStellarPublicKey('SBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJJBBQ2EIISQE2BNXQ5BNRQ5')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should validate strong passwords', () => {
      expect(service.isValidPassword('SecurePass123!')).toBe(true);
      expect(service.isValidPassword('MyP@ssw0rd')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(service.isValidPassword('weak')).toBe(false);
      expect(service.isValidPassword('NoSpecialChar123')).toBe(false);
      expect(service.isValidPassword('nouppercase123!')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate valid URLs', () => {
      expect(service.isValidUrl('https://example.com')).toBe(true);
      expect(service.isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(service.isValidUrl('not-a-url')).toBe(false);
      expect(service.isValidUrl('htp://invalid')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate valid phone numbers', () => {
      expect(service.isValidPhoneNumber('+12025551234')).toBe(true);
      expect(service.isValidPhoneNumber('12025551234')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(service.isValidPhoneNumber('123')).toBe(false);
      expect(service.isValidPhoneNumber('invalid')).toBe(false);
    });
  });

  describe('isValidPercentage', () => {
    it('should validate valid percentages', () => {
      expect(service.isValidPercentage(0)).toBe(true);
      expect(service.isValidPercentage(50)).toBe(true);
      expect(service.isValidPercentage(100)).toBe(true);
    });

    it('should reject invalid percentages', () => {
      expect(service.isValidPercentage(-1)).toBe(false);
      expect(service.isValidPercentage(101)).toBe(false);
      expect(service.isValidPercentage('50' as any)).toBe(false);
    });
  });

  describe('isValidDateRange', () => {
    it('should validate valid date ranges', () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-12-31');
      expect(service.isValidDateRange(start, end)).toBe(true);
    });

    it('should reject invalid date ranges', () => {
      const start = new Date('2026-12-31');
      const end = new Date('2026-01-01');
      expect(service.isValidDateRange(start, end)).toBe(false);
    });
  });

  describe('isValidCouponCode', () => {
    it('should validate valid coupon codes', () => {
      expect(service.isValidCouponCode('SUMMER2026')).toBe(true);
      expect(service.isValidCouponCode('SAVE-50')).toBe(true);
    });

    it('should reject invalid coupon codes', () => {
      expect(service.isValidCouponCode('ab')).toBe(false);
      expect(service.isValidCouponCode('lowercase')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should validate valid UUIDs', () => {
      expect(service.isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(service.isValidUUID('not-a-uuid')).toBe(false);
      expect(service.isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });

  describe('isValidPagination', () => {
    it('should validate valid pagination', () => {
      expect(service.isValidPagination(1, 10)).toBe(true);
      expect(service.isValidPagination(5, 50)).toBe(true);
    });

    it('should reject invalid pagination', () => {
      expect(service.isValidPagination(0, 10)).toBe(false);
      expect(service.isValidPagination(1, 101)).toBe(false);
    });
  });
});
