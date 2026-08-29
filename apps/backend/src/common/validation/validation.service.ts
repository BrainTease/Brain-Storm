import { Injectable, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Centralised validation helper — issue #806.
 *
 * ## Design contract
 *
 * The **single source of truth** for all input validation rules is the
 * class-validator decorators applied to DTO classes (e.g. `@IsEmail()`,
 * `@MinLength(8)`, `@IsStellarPublicKey()`).  This service exposes ergonomic
 * wrappers that run those decorators programmatically (e.g. in services that
 * receive plain objects from queues or background jobs rather than HTTP
 * controllers).
 *
 * ## What was removed (#806)
 *
 * The previous version contained standalone regex helpers (`isValidEmail`,
 * `isValidPassword`, `isValidStellarPublicKey`, etc.) that duplicated the
 * validation rules already encoded in DTO decorators and in
 * `src/common/validation/custom.validators.ts`.  Keeping two separate rule
 * definitions made it possible for them to drift out of sync.  They have been
 * removed; any caller that needs those checks should:
 *
 *   a) Accept a typed DTO and let the global `ValidationPipe` do the work, or
 *   b) Use the custom validator decorators from `custom.validators.ts` directly,
 *      or
 *   c) Call `validationService.validateDto(MyDto, plainObject)` and let the DTO
 *      decorators carry the rules.
 */
@Injectable()
export class ValidationService {
  /**
   * Validate a plain object against a DTO class, throwing `BadRequestException`
   * on failure.  Useful for validating data that arrives outside of HTTP
   * request pipelines (e.g. queue payloads, webhook bodies).
   */
  async validateDto<T>(dtoClass: new () => T, plainObject: unknown): Promise<T> {
    const dto = plainToClass(dtoClass, plainObject);
    const errors = await validate(dto as object, {
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
   * Like `validateDto` but returns errors instead of throwing — useful when
   * calling code wants to accumulate errors before deciding how to respond.
   */
  async validateDtoSilent<T>(
    dtoClass: new () => T,
    plainObject: unknown
  ): Promise<{ valid: boolean; errors?: ValidationError[] }> {
    const dto = plainToClass(dtoClass, plainObject);
    const errors = await validate(dto as object, {
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
   * Validate a partial object (PATCH semantics) — missing properties are
   * allowed.
   */
  async validatePartialDto<T>(dtoClass: new () => T, plainObject: unknown): Promise<T> {
    const dto = plainToClass(dtoClass, plainObject);
    const errors = await validate(dto as object, {
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
   * Validate an array of plain objects against the same DTO class.  Each
   * item's index is prepended to its property path so callers can identify
   * which array element failed.
   */
  async validateDtoArray<T>(dtoClass: new () => T, plainObjects: unknown[]): Promise<T[]> {
    const dtos = (plainObjects as unknown[]).map((obj) => plainToClass(dtoClass, obj));
    const allErrors: ValidationError[] = [];

    for (let i = 0; i < dtos.length; i++) {
      const errors = await validate(dtos[i] as object, {
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

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Converts a flat or nested ValidationError tree into a map of
   * `{ field: string[] }` for consistent API error responses.
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
}
