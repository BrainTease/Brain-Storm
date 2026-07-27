# Dependency Injection Best Practices

## Overview

This document outlines best practices for using dependency injection in Brain-Storm.

## 1. Constructor Injection

### ✅ Good

```typescript
@Injectable()
export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly validationService: ValidationService,
    private readonly logger: Logger,
  ) {}
}
```

### ❌ Bad

```typescript
@Injectable()
export class CourseService {
  @Inject(CourseRepository)
  private courseRepository: CourseRepository;

  @Inject(ValidationService)
  private validationService: ValidationService;
}
```

**Why**: Constructor injection makes dependencies explicit and testable.

## 2. Dependency Ordering

### ✅ Good

```typescript
constructor(
  private readonly repository: CourseRepository,
  private readonly service: CourseService,
  private readonly logger: Logger,
) {}
```

### ❌ Bad

```typescript
constructor(
  private readonly logger: Logger,
  private readonly repository: CourseRepository,
  private readonly service: CourseService,
) {}
```

**Why**: Order dependencies by importance/usage.

## 3. Interface-Based Dependencies

### ✅ Good

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

### ❌ Bad

```typescript
@Injectable()
export class CourseService {
  constructor(private repository: CourseRepository) {}
}
```

**Why**: Interfaces allow for easier mocking and implementation swapping.

## 4. Module Organization

### ✅ Good

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Course])],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository],
  exports: [CourseService],
})
export class CourseModule {}
```

### ❌ Bad

```typescript
@Module({
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
```

**Why**: Proper exports allow other modules to use services.

## 5. Avoid Service Locator Pattern

### ✅ Good

```typescript
@Injectable()
export class CourseService {
  constructor(private userService: UserService) {}

  async create(dto: CreateCourseDto) {
    const user = await this.userService.findOne(dto.userId);
    // ...
  }
}
```

### ❌ Bad

```typescript
@Injectable()
export class CourseService {
  constructor(private serviceLocator: ServiceLocator) {}

  async create(dto: CreateCourseDto) {
    const userService = this.serviceLocator.getService('UserService');
    const user = await userService.findOne(dto.userId);
    // ...
  }
}
```

**Why**: Service locator hides dependencies and makes testing harder.

## 6. Handle Circular Dependencies

### ✅ Good

```typescript
@Module({
  imports: [forwardRef(() => UserModule)],
})
export class CourseModule {}

@Module({
  imports: [forwardRef(() => CourseModule)],
})
export class UserModule {}
```

### ❌ Bad

```typescript
// Circular dependency without forwardRef
@Module({
  imports: [UserModule],
})
export class CourseModule {}

@Module({
  imports: [CourseModule],
})
export class UserModule {}
```

**Why**: forwardRef allows modules to reference each other.

## 7. Optional Dependencies

### ✅ Good

```typescript
@Injectable()
export class CourseService {
  constructor(
    private readonly repository: CourseRepository,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async findOne(id: string) {
    if (this.cacheService) {
      return this.cacheService.get(`course:${id}`);
    }
    return this.repository.findOne(id);
  }
}
```

### ❌ Bad

```typescript
@Injectable()
export class CourseService {
  constructor(private readonly cacheService: CacheService) {}
}
```

**Why**: Optional dependencies allow graceful degradation.

## 8. Lazy Loading

### ✅ Good

```typescript
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        // ...
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
```

### ❌ Bad

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({
      // Hardcoded configuration
    }),
  ],
})
export class DatabaseModule {}
```

**Why**: Async factories allow dynamic configuration.

## 9. Scope Management

### ✅ Good

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
  // New instance per request
}

@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {
  // New instance every time
}

@Injectable() // Default: Scope.DEFAULT (singleton)
export class SingletonService {
  // Single instance for entire application
}
```

### ❌ Bad

```typescript
@Injectable()
export class RequestScopedService {
  // Should be REQUEST scoped but isn't
}
```

**Why**: Proper scoping prevents memory leaks and state issues.

## 10. Testing

### ✅ Good

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

### ❌ Bad

```typescript
describe('CourseService', () => {
  let service: CourseService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CourseService, CourseRepository],
    }).compile();

    service = module.get(CourseService);
  });

  // Tests are slow and coupled to implementation
});
```

**Why**: Direct instantiation is faster and more focused.

## 11. Dependency Injection in Controllers

### ✅ Good

```typescript
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }
}
```

### ❌ Bad

```typescript
@Controller('courses')
export class CourseController {
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const service = new CourseService();
    return service.findOne(id);
  }
}
```

**Why**: DI in controllers allows for easier testing and configuration.

## 12. Factory Functions

### ✅ Good

```typescript
export function createCourseService(repository: CourseRepository): CourseService {
  return new CourseService(repository);
}

@Module({
  providers: [
    {
      provide: CourseService,
      useFactory: createCourseService,
      inject: [CourseRepository],
    },
  ],
})
export class CourseModule {}
```

### ❌ Bad

```typescript
@Module({
  providers: [
    {
      provide: CourseService,
      useFactory: () => new CourseService(new CourseRepository()),
    },
  ],
})
export class CourseModule {}
```

**Why**: Factory functions are testable and reusable.

## 13. Configuration Management

### ✅ Good

```typescript
@Injectable()
export class CourseService {
  private readonly maxCourses: number;

  constructor(private configService: ConfigService) {
    this.maxCourses = this.configService.get('MAX_COURSES', 100);
  }
}
```

### ❌ Bad

```typescript
@Injectable()
export class CourseService {
  private readonly maxCourses = process.env.MAX_COURSES || 100;
}
```

**Why**: ConfigService provides type-safe configuration.

## 14. Error Handling

### ✅ Good

```typescript
@Injectable()
export class CourseService {
  constructor(
    private readonly repository: CourseRepository,
    private readonly logger: Logger,
  ) {}

  async create(dto: CreateCourseDto) {
    try {
      return await this.repository.create(dto);
    } catch (error) {
      this.logger.error('Failed to create course', error);
      throw new BadRequestException('Failed to create course');
    }
  }
}
```

### ❌ Bad

```typescript
@Injectable()
export class CourseService {
  async create(dto: CreateCourseDto) {
    return this.repository.create(dto); // No error handling
  }
}
```

**Why**: Proper error handling improves reliability.

## 15. Documentation

### ✅ Good

```typescript
/**
 * Course service for managing courses
 * @example
 * const course = await courseService.create({ title: 'Test' });
 */
@Injectable()
export class CourseService {
  /**
   * Create a new course
   * @param dto - Course creation data
   * @returns Created course
   * @throws BadRequestException if validation fails
   */
  async create(dto: CreateCourseDto): Promise<Course> {
    // ...
  }
}
```

### ❌ Bad

```typescript
@Injectable()
export class CourseService {
  async create(dto: CreateCourseDto): Promise<Course> {
    // No documentation
  }
}
```

**Why**: Documentation helps other developers understand dependencies.

## Summary

| Practice | Benefit |
|----------|---------|
| Constructor Injection | Explicit dependencies, testable |
| Interface-Based | Flexible, mockable |
| Proper Exports | Reusable across modules |
| Avoid Service Locator | Clear dependencies, testable |
| Handle Circular Deps | Prevents runtime errors |
| Optional Dependencies | Graceful degradation |
| Lazy Loading | Dynamic configuration |
| Scope Management | Memory efficiency |
| Good Testing | Reliable code |
| Documentation | Maintainability |

## References

- [NestJS DI Documentation](https://docs.nestjs.com/providers)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Dependency Injection Pattern](https://en.wikipedia.org/wiki/Dependency_injection)
- [Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
