import { applyDecorators, BadRequestException, UseInterceptors } from '@nestjs/common';
import { ObjectSchema, ValidationError } from 'joi';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

export interface ValidationSchema {
  body?: ObjectSchema;
  query?: ObjectSchema;
  params?: ObjectSchema;
}

@Injectable()
class ValidationInterceptor implements NestInterceptor {
  constructor(private schema: ValidationSchema) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Validate body
    if (this.schema.body && request.body) {
      const { error, value } = this.schema.body.validate(request.body, {
        stripUnknown: true,
        abortEarly: false,
      });
      if (error) {
        throw this.formatValidationError(error);
      }
      request.body = value;
    }

    // Validate query
    if (this.schema.query && Object.keys(request.query).length > 0) {
      const { error, value } = this.schema.query.validate(request.query, {
        stripUnknown: true,
        abortEarly: false,
      });
      if (error) {
        throw this.formatValidationError(error);
      }
      request.query = value;
    }

    // Validate params
    if (this.schema.params && Object.keys(request.params).length > 0) {
      const { error, value } = this.schema.params.validate(request.params, {
        stripUnknown: true,
        abortEarly: false,
      });
      if (error) {
        throw this.formatValidationError(error);
      }
      request.params = value;
    }

    return next.handle();
  }

  private formatValidationError(error: ValidationError): BadRequestException {
    const details = error.details.map((d) => `${d.path.join('.')}: ${d.message}`);
    return new BadRequestException({
      message: 'Request validation failed',
      errors: details,
    });
  }
}

/**
 * @ValidateRequest decorator
 *
 * Applies schema-based validation to request body, query, and params
 * Automatically rejects malformed payloads with descriptive error messages
 *
 * Usage:
 *   @Post('endpoint')
 *   @ValidateRequest({ body: fundTestnetSchema })
 *   async fundTestnet(@Body() body: any) {
 *     // body is now validated and sanitized
 *   }
 */
export function ValidateRequest(schema: ValidationSchema) {
  return applyDecorators(UseInterceptors(new ValidationInterceptor(schema)));
}
