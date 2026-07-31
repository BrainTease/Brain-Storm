/**
 * Public barrel for the common/validation package.
 *
 * Issue #806: `ValidationMiddleware`, `ValidationErrorFormatter`, and
 * `ValidationErrorResponse` were removed (no-op middleware and classes that
 * duplicated `GlobalExceptionFilter`).  Only the still-useful exports remain.
 */
export * from './validation.service';
export * from './validation.schemas';
export * from './custom.validators';
