# Validation Guide

This guide explains how to use the centralized validation system in Brain-Storm backend.

## Overview

The validation system provides:
- Reusable validation schemas
- Custom validators for domain-specific rules
- Centralized validation service
- Consistent error formatting

## Validation Schemas

Pre-built schemas for common use cases:

```typescript
import { EmailSchema, PasswordSchema, CourseSchema } from '@common/validation/validation.schemas';

export class RegisterDto extends EmailSchema, PasswordSchema {
  @IsString()
  firstName: string;
}
```

Available schemas:
- `EmailSchema` - Email validation
- `PasswordSchema` - Strong password validation
- `UUIDSchema` - UUID validation
- `PaginationSchema` - Pagination parameters
- `DateRangeSchema` - Date range validation
- `CourseSchema` - Course data validation
- `UserSchema` - User data validation
- `RoleSchema` - Role validation
- `SearchSchema` - Search query validation
- `RatingSchema` - Rating/review validation
- `EnrollmentSchema` - Course enrollment validation
- `ProgressSchema` - Progress tracking validation
- `NotificationPreferenceSchema` - Notification preferences
- `WebhookSchema` - Webhook configuration
- `BatchOperationSchema` - Batch operations
- `AuditLogSchema` - Audit logging
- `StellarTransactionSchema` - Stellar transactions
- `KycSchema` - KYC verification
- `CouponSchema` - Coupon codes

## Custom Validators

Domain-specific validators:

```typescript
import { IsStellarPublicKey, IsStrongPassword, IsValidUrl } from '@common/validation/custom.validators';

export class MyDto {
  @IsStellarPublicKey()
  publicKey: string;

  @IsStrongPassword()
  password: string;

  @IsValidUrl()
  webhookUrl: string;
}
```

Available custom validators:
- `@IsStellarPublicKey()` - Validates Stellar public key format
- `@IsStrongPassword()` - Validates password strength
- `@IsValidCouponCode()` - Validates coupon code format
- `@IsValidUrl()` - Validates URL format
- `@IsValidPhoneNumber()` - Validates phone number (E.164)
- `@IsValidPercentage()` - Validates percentage (0-100)
- `@IsValidDateRange()` - Validates date range

## Validation Service

Use the `ValidationService` for programmatic validation:

```typescript
import { ValidationService } from '@common/validation/validation.service';

@Injectable()
export class MyService {
  constructor(private validationService: ValidationService) {}

  async processData(data: any) {
    // Validate and throw on error
    const dto = await this.validationService.validateDto(MyDto, data);

    // Validate silently (returns errors)
    const result = await this.validationService.validateDtoSilent(MyDto, data);
    if (!result.valid) {
      console.log('Validation errors:', result.errors);
    }

    // Validate partial object (for PATCH)
    const partialDto = await this.validationService.validatePartialDto(MyDto, data);

    // Validate array
    const dtos = await this.validationService.validateDtoArray(MyDto, dataArray);
  }

  validateEmail(email: string): boolean {
    return this.validationService.isValidEmail(email);
  }

  validateStellarKey(key: string): boolean {
    return this.validationService.isValidStellarPublicKey(key);
  }
}
```

## Usage in Controllers

```typescript
import { ValidationService } from '@common/validation/validation.service';

@Controller('courses')
export class CoursesController {
  constructor(private validationService: ValidationService) {}

  @Post()
  async create(@Body() createCourseDto: CreateCourseDto) {
    // Validation happens automatically via class-validator decorators
    // Use ValidationService for additional validation if needed
    return this.coursesService.create(createCourseDto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    // Validate partial update
    const validated = await this.validationService.validatePartialDto(UpdateCourseDto, updateCourseDto);
    return this.coursesService.update(id, validated);
  }
}
```

## Error Responses

Validation errors are formatted consistently:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "email": ["must be an email"],
    "password": ["Password must be 8-128 characters with uppercase, lowercase, number, and special character"],
    "title": ["must be longer than or equal to 3 characters"]
  },
  "timestamp": "2026-06-01T05:24:18.838Z"
}
```

## Best Practices

1. **Reuse Schemas**: Use pre-built schemas instead of repeating decorators
2. **Custom Validators**: Create custom validators for domain-specific rules
3. **Consistent Naming**: Follow naming conventions for DTOs and validators
4. **Documentation**: Document validation rules in DTO comments
5. **Error Messages**: Provide clear, user-friendly error messages
6. **Sanitization**: Combine validation with sanitization for security

## Example: Complete DTO

```typescript
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';
import { IsStellarPublicKey } from '@common/validation/custom.validators';
import { CourseSchema } from '@common/validation/validation.schemas';

export class CreateCourseWithInstructorDto extends CourseSchema {
  @IsEmail()
  instructorEmail: string;

  @IsStellarPublicKey()
  instructorStellarKey: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  syllabus?: string;
}
```

## Testing Validation

```typescript
import { ValidationService } from '@common/validation/validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  it('should validate email', () => {
    expect(service.isValidEmail('test@example.com')).toBe(true);
    expect(service.isValidEmail('invalid-email')).toBe(false);
  });

  it('should validate Stellar public key', () => {
    expect(service.isValidStellarPublicKey('GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJJBBQ2EIISQE2BNXQ5BNRQ5')).toBe(true);
    expect(service.isValidStellarPublicKey('invalid-key')).toBe(false);
  });
});
```
