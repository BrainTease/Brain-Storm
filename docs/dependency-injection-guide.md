# Dependency Injection Guide

## Overview

Brain-Storm uses NestJS's built-in dependency injection system combined with a custom DI container for advanced scenarios.

## NestJS Built-in DI

### Constructor Injection (Recommended)

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly validationService: ValidationService,
  ) {}

  async create(dto: CreateCourseDto) {
    // Services are automatically injected
    return this.courseRepository.save(dto);
  }
}
```

### Property Injection

```typescript
import { Inject } from '@nestjs/common';

@Injectable()
export class CourseService {
  @Inject(CourseRepository)
  private courseRepository: CourseRepository;
}
```

### Optional Dependencies

```typescript
import { Optional } from '@nestjs/common';

@Injectable()
export class CourseService {
  constructor(
    @Optional() private readonly cacheService?: CacheService,
  ) {}
}
```

## Module Configuration

### Basic Module

```typescript
import { Module } from '@nestjs/common';
import { CourseService } from './services/course.service';
import { CourseController } from './controllers/course.controller';

@Module({
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService], // Export for other modules
})
export class CourseModule {}
```

### Module with Dependencies

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Course]), ValidationModule],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
```

### Global Module

```typescript
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [ValidationService],
  exports: [ValidationService],
})
export class ValidationModule {}
```

## Provider Types

### Class Provider

```typescript
@Module({
  providers: [CourseService],
})
export class CourseModule {}

// Or explicit
@Module({
  providers: [
    {
      provide: CourseService,
      useClass: CourseService,
    },
  ],
})
export class CourseModule {}
```

### Value Provider

```typescript
const mockCourseService = {
  create: jest.fn(),
};

@Module({
  providers: [
    {
      provide: CourseService,
      useValue: mockCourseService,
    },
  ],
})
export class CourseModule {}
```

### Factory Provider

```typescript
@Module({
  providers: [
    {
      provide: CourseService,
      useFactory: (repository: CourseRepository) => {
        return new CourseService(repository);
      },
      inject: [CourseRepository],
    },
  ],
})
export class CourseModule {}
```

### Async Factory Provider

```typescript
@Module({
  providers: [
    {
      provide: DatabaseConnection,
      useFactory: async () => {
        return await createDatabaseConnection();
      },
    },
  ],
})
export class DatabaseModule {}
```

## Custom DI Container

For advanced scenarios, use the custom DI container:

```typescript
import { DIContainer } from '@common/di';

@Injectable()
export class MyService {
  constructor(private diContainer: DIContainer) {}

  registerService() {
    this.diContainer.register('MyService', new MyService());
  }

  getService() {
    return this.diContainer.get('MyService');
  }
}
```

### Register Services

```typescript
// Register instance
container.register('CourseService', courseService);

// Register singleton
container.registerSingleton('CourseService', () => new CourseService());

// Get service
const service = container.get('CourseService');

// Check if registered
if (container.has('CourseService')) {
  // ...
}

// Remove service
container.remove('CourseService');

// Clear all
container.clear();
```

## Service Locator Pattern

Use sparingly - prefer constructor injection:

```typescript
import { ServiceLocator } from '@common/di';

@Injectable()
export class MyService {
  constructor(private serviceLocator: ServiceLocator) {}

  doSomething() {
    const courseService = this.serviceLocator.getService('CourseService');
    // ...
  }
}
```

## Best Practices

### 1. Use Constructor Injection

```typescript
// Good
@Injectable()
export class CourseService {
  constructor(private repository: CourseRepository) {}
}

// Avoid
@Injectable()
export class CourseService {
  @Inject(CourseRepository)
  private repository: CourseRepository;
}
```

### 2. Export Services from Modules

```typescript
@Module({
  providers: [CourseService],
  exports: [CourseService], // Allow other modules to use
})
export class CourseModule {}
```

### 3. Use Interfaces for Abstraction

```typescript
export interface ICourseRepository {
  create(dto: CreateCourseDto): Promise<Course>;
  findOne(id: string): Promise<Course>;
}

@Injectable()
export class CourseService {
  constructor(private repository: ICourseRepository) {}
}
```

### 4. Avoid Circular Dependencies

```typescript
// Problem: Circular dependency
// CourseModule imports UserModule
// UserModule imports CourseModule

// Solution: Use forwardRef
@Module({
  imports: [forwardRef(() => UserModule)],
})
export class CourseModule {}
```

### 5. Use Dependency Injection for Configuration

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CourseService {
  constructor(private configService: ConfigService) {}

  getSetting() {
    return this.configService.get('COURSE_SETTING');
  }
}
```

## Testing with DI

### Unit Testing

```typescript
describe('CourseService', () => {
  let service: CourseService;
  let repository: CourseRepository;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findOne: jest.fn(),
    } as any;

    service = new CourseService(repository);
  });

  it('should create course', async () => {
    const dto = { title: 'Test' };
    await service.create(dto);
    expect(repository.create).toHaveBeenCalledWith(dto);
  });
});
```

### Integration Testing

```typescript
describe('CourseModule', () => {
  let app: INestApplication;
  let courseService: CourseService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CourseModule, DatabaseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    courseService = moduleFixture.get<CourseService>(CourseService);
  });

  it('should create course', async () => {
    const result = await courseService.create({ title: 'Test' });
    expect(result).toBeDefined();
  });
});
```

## Common Patterns

### Repository Pattern

```typescript
@Injectable()
export class CourseRepository {
  constructor(
    @InjectRepository(Course)
    private repository: Repository<Course>,
  ) {}

  async create(dto: CreateCourseDto): Promise<Course> {
    return this.repository.save(dto);
  }
}

@Injectable()
export class CourseService {
  constructor(private repository: CourseRepository) {}

  async create(dto: CreateCourseDto): Promise<Course> {
    return this.repository.create(dto);
  }
}
```

### Strategy Pattern

```typescript
export interface PaymentStrategy {
  pay(amount: number): Promise<void>;
}

@Injectable()
export class StripePayment implements PaymentStrategy {
  async pay(amount: number): Promise<void> {
    // Stripe implementation
  }
}

@Injectable()
export class PaymentService {
  constructor(private strategy: PaymentStrategy) {}

  async processPayment(amount: number): Promise<void> {
    return this.strategy.pay(amount);
  }
}
```

### Factory Pattern

```typescript
@Injectable()
export class ServiceFactory {
  create(type: string): any {
    switch (type) {
      case 'course':
        return new CourseService();
      case 'user':
        return new UserService();
      default:
        throw new Error(`Unknown service type: ${type}`);
    }
  }
}
```

## Troubleshooting

### Issue: "Cannot find module"

**Solution**: Ensure module is imported in parent module

```typescript
@Module({
  imports: [CourseModule], // Add missing import
  controllers: [AppController],
})
export class AppModule {}
```

### Issue: "Circular dependency detected"

**Solution**: Use forwardRef or reorganize modules

```typescript
@Module({
  imports: [forwardRef(() => UserModule)],
})
export class CourseModule {}
```

### Issue: "Provider not found"

**Solution**: Ensure provider is registered and exported

```typescript
@Module({
  providers: [CourseService],
  exports: [CourseService], // Add export
})
export class CourseModule {}
```

## References

- [NestJS Dependency Injection](https://docs.nestjs.com/providers)
- [NestJS Modules](https://docs.nestjs.com/modules)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Dependency Injection Pattern](https://en.wikipedia.org/wiki/Dependency_injection)
