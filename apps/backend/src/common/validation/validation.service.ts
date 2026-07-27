import { Injectable, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Centralized validation service for backend
 */
@Injectable()
export class ValidationService {
  /**
   * Validate an object against a DTO class
   */
  async validateDto<T>(dtoClass: new () => T, plainObject: any): Promise<T> {
    const dto = plainToClass(dtoClass, plainObject);
    const errors = await validate(dto, {
      skipMissingProperties: false,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return dto;
  }

  /**
   * Validate an object without throwing (returns errors)
   */
  async validateDtoSilent<T>(dtoClass: new () => T, plainObject: any): Promise<{ valid: boolean; errors?: ValidationError[] }> {
    const dto = plainToClass(dtoClass, plainObject);
    const errors = await validate(dto, {
      skipMissingProperties: false,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate partial object (for PATCH requests)
   */
  async validatePartialDto<T>(dtoClass: new () => T, plainObject: any): Promise<T> {
    const dto = plainToClass(dtoClass, plainObject);
    const errors = await validate(dto, {
      skipMissingProperties: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return dto;
  }

  /**
   * Validate array of objects
   */
  async validateDtoArray<T>(dtoClass: new () => T, plainObjects: any[]): Promise<T[]> {
    const dtos = plainObjects.map((obj) => plainToClass(dtoClass, obj));
    const allErrors: ValidationError[] = [];

    for (let i = 0; i < dtos.length; i++) {
      const errors = await validate(dtos[i], {
        skipMissingProperties: false,
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (errors.length > 0) {
        allErrors.push(...errors.map((e) => ({ ...e, property: `[${i}].${e.property}` })));
      }
    }

    if (allErrors.length > 0) {
      throw new BadRequestException(this.formatErrors(allErrors));
    }

    return dtos;
  }

  /**
   * Format validation errors for response
   */
  private formatErrors(errors: ValidationError[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    const flattenErrors = (error: ValidationError, prefix = '') => {
      const field = prefix ? `${prefix}.${error.property}` : error.property;

      if (error.constraints) {
        formatted[field] = Object.values(error.constraints);
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => flattenErrors(child, field));
      }
    };

    errors.forEach((error) => flattenErrors(error));
    return formatted;
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Stellar public key
   */
  isValidStellarPublicKey(publicKey: string): boolean {
    return /^G[A-Z2-7]{55}$/.test(publicKey);
  }

  /**
   * Validate strong password
   */
  isValidPassword(password: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/.test(password);
  }

  /**
   * Validate URL
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate phone number (E.164 format)
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    return /^\+?[1-9]\d{1,14}$/.test(phoneNumber);
  }

  /**
   * Validate percentage (0-100)
   */
  isValidPercentage(value: number): boolean {
    return typeof value === 'number' && value >= 0 && value <= 100;
  }

  /**
   * Validate date range
   */
  isValidDateRange(startDate: Date | string, endDate: Date | string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end;
  }

  /**
   * Validate coupon code format
   */
  isValidCouponCode(code: string): boolean {
    return /^[A-Z0-9-]{3,50}$/.test(code);
  }

  /**
   * Validate UUID
   */
  isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate pagination parameters
   */
  isValidPagination(page: number, limit: number): boolean {
    return page >= 1 && limit >= 1 && limit <= 100;
  }
}
