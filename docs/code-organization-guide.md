# Code Organization Guide

## Overview

This document outlines the improved code organization structure for Brain-Storm backend.

## Directory Structure

```
apps/backend/src/
├── common/                          # Shared utilities and infrastructure
│   ├── validation/                  # Centralized validation
│   ├── utils/                       # Utility functions
│   ├── decorators/                  # Custom decorators
│   ├── filters/                     # Exception filters
│   ├── interceptors/                # HTTP interceptors
│   ├── pipes/                       # Validation pipes
│   ├── sanitizers/                  # Input sanitizers
│   ├── errors/                      # Error handling
│   ├── logger/                      # Logging service
│   ├── encryption.service.ts        # Encryption utilities
│   └── request-context.service.ts   # Request context
│
├── config/                          # Configuration
│   ├── configuration.ts             # Config loader
│   └── validation.schema.ts         # Config validation
│
├── auth/                            # Authentication & Authorization
│   ├── strategies/                  # Passport strategies
│   ├── guards/                      # Auth guards
│   ├── decorators/                  # Auth decorators
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── auth.module.ts
│
├── features/                        # Feature modules
│   ├── courses/                     # Course management
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── courses.module.ts
│   │
│   ├── users/                       # User management
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── users.module.ts
│   │
│   ├── enrollments/                 # Course enrollments
│   ├── progress/                    # Progress tracking
│   ├── certificates/                # Certificate management
│   ├── credentials/                 # Credential issuance
│   ├── notifications/               # Notifications
│   ├── analytics/                   # Analytics
│   ├── forums/                      # Community forums
│   ├── quizzes/                     # Quiz management
│   ├── surveys/                     # Survey management
│   ├── leaderboard/                 # Leaderboard
│   ├── cohorts/                     # Cohort management
│   ├── recommendations/             # Recommendations
│   ├── search/                      # Search functionality
│   ├── moderation/                  # Content moderation
│   ├── access-control/              # Access control
│   ├── coupons/                     # Coupon management
│   ├── payouts/                     # Payout management
│   ├── kyc/                         # KYC verification
│   ├── webhooks/                    # Webhook management
│   ├── import-export/               # Data import/export
│   ├── batch/                       # Batch operations
│   ├── reminders/                   # Reminders
│   ├── email/                       # Email service
│   ├── mail/                        # Mail templates
│   ├── cdn/                         # CDN management
│   ├── cache/                       # Cache management
│   ├── rate-limit/                  # Rate limiting
│   ├── api-usage/                   # API usage tracking
│   ├── audit/                       # Audit logging
│   ├── health/                      # Health checks
│   ├── gateway/                     # API gateway
│   ├── metrics/                     # Metrics collection
│   ├── secrets/                     # Secret management
│   └── stellar/                     # Stellar integration
│
├── database/                        # Database layer
│   ├── migrations/                  # Database migrations
│   ├── seeds/                       # Database seeds
│   └── data-source.ts               # TypeORM configuration
│
├── test/                            # Testing utilities
│   ├── factories/                   # Test data factories
│   ├── test-data.service.ts
│   └── integration-test.setup.ts
│
├── app.module.ts                    # Root module
├── main.ts                          # Application entry point
└── instrument.ts                    # Instrumentation
```

## Module Organization

Each feature module should follow this structure:

```
feature/
├── controllers/
│   ├── feature.controller.ts
│   └── feature.controller.spec.ts
├── services/
│   ├── feature.service.ts
│   ├── feature.service.spec.ts
│   └── feature.service.integration-spec.ts
├── entities/
│   └── feature.entity.ts
├── dto/
│   ├── create-feature.dto.ts
│   ├── update-feature.dto.ts
│   └── feature-query.dto.ts
├── guards/
│   └── feature.guard.ts
├── interceptors/
│   └── feature.interceptor.ts
├── feature.module.ts
└── feature.constants.ts
```

## Naming Conventions

### Files
- Controllers: `*.controller.ts`
- Services: `*.service.ts`
- Entities: `*.entity.ts`
- DTOs: `*.dto.ts`
- Guards: `*.guard.ts`
- Interceptors: `*.interceptor.ts`
- Modules: `*.module.ts`
- Tests: `*.spec.ts` (unit), `*.integration-spec.ts` (integration)

### Classes
- Controllers: `FeatureController`
- Services: `FeatureService`
- Entities: `Feature`
- DTOs: `CreateFeatureDto`, `UpdateFeatureDto`
- Guards: `FeatureGuard`
- Modules: `FeatureModule`

### Methods
- Create: `create(dto)`
- Read: `findOne(id)`, `findAll(query)`
- Update: `update(id, dto)`
- Delete: `remove(id)`

## Import Organization

```typescript
// 1. External dependencies
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// 2. Common utilities
import { ValidationService } from '@common/validation';
import { StringUtils, ArrayUtils } from '@common/utils';

// 3. Feature-specific imports
import { Feature } from './entities/feature.entity';
import { CreateFeatureDto } from './dto/create-feature.dto';

// 4. Other feature imports
import { OtherService } from '../other/services/other.service';
```

## Dependency Injection

Always use constructor injection:

```typescript
@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(Feature)
    private readonly repository: Repository<Feature>,
    private readonly validationService: ValidationService,
    private readonly otherService: OtherService,
  ) {}
}
```

## Error Handling

Use centralized error handling:

```typescript
import { AppError } from '@common/errors';

throw new AppError('Feature not found', 404, 'FEATURE_NOT_FOUND');
```

## Logging

Use the centralized logger:

```typescript
import { Logger } from '@common/logger';

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  async create(dto: CreateFeatureDto) {
    this.logger.log('Creating feature', { dto });
    // ...
  }
}
```

## Testing

- Unit tests: `*.spec.ts` - Test individual methods
- Integration tests: `*.integration-spec.ts` - Test with database
- E2E tests: `tests/e2e/` - Test full workflows

## Constants

Define constants in `feature.constants.ts`:

```typescript
export const FEATURE_CONSTANTS = {
  MAX_TITLE_LENGTH: 255,
  MIN_TITLE_LENGTH: 3,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
};
```

## Environment Variables

Use centralized configuration:

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeatureService {
  constructor(private configService: ConfigService) {}

  getSetting() {
    return this.configService.get('FEATURE_SETTING');
  }
}
```

## Database Entities

- One entity per file
- Use TypeORM decorators
- Include timestamps (createdAt, updatedAt)
- Add indexes for frequently queried fields

```typescript
@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## DTOs

- Separate DTOs for create, update, query
- Use validation decorators
- Include JSDoc comments

```typescript
export class CreateFeatureDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;
}
```

## Services

- Single responsibility principle
- Inject dependencies via constructor
- Use async/await
- Handle errors appropriately

```typescript
@Injectable()
export class FeatureService {
  async create(dto: CreateFeatureDto): Promise<Feature> {
    const feature = this.repository.create(dto);
    return this.repository.save(feature);
  }
}
```

## Controllers

- Handle HTTP concerns only
- Delegate business logic to services
- Use appropriate HTTP methods and status codes
- Include proper error handling

```typescript
@Controller('features')
export class FeatureController {
  constructor(private readonly service: FeatureService) {}

  @Post()
  async create(@Body() dto: CreateFeatureDto) {
    return this.service.create(dto);
  }
}
```

## Migration Guide

### Step 1: Reorganize Directories
Move files to new structure while maintaining functionality.

### Step 2: Update Imports
Update all import paths to reflect new structure.

### Step 3: Update Module Exports
Ensure all modules properly export their services.

### Step 4: Test
Run all tests to ensure nothing broke.

### Step 5: Update Documentation
Update any documentation referencing old structure.

## Benefits

1. **Scalability**: Easier to add new features
2. **Maintainability**: Clear structure and organization
3. **Testability**: Isolated modules are easier to test
4. **Reusability**: Common utilities are centralized
5. **Consistency**: Standardized patterns across codebase

## Tools for Organization

- ESLint: Enforce import ordering
- Prettier: Format code consistently
- TypeScript: Type safety
- NestJS: Framework structure

## References

- [NestJS Best Practices](https://docs.nestjs.com/techniques/mvc)
- [Clean Code Principles](https://en.wikipedia.org/wiki/Clean_code)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
