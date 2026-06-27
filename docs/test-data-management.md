# Test Data Management

## Overview
Centralized test data generation and management using factories and seeders.

## Factories
Located in `apps/backend/tests/factories/`:

```typescript
import { UserFactory, CourseFactory, EnrollmentFactory } from '@/tests/factories';

// Single entity
const user = UserFactory.create({ role: 'admin' });

// Multiple entities
const users = UserFactory.createMany(5);

// With overrides
const course = CourseFactory.create({ title: 'Advanced Rust' });
```

## Seeding
Use `TestDataSeeder` for test setup:

```typescript
const seeder = new TestDataSeeder(dataSource);
const users = await seeder.seedUsers(10);
const courses = await seeder.seedCourses(5);
await seeder.seedEnrollments(userIds, courseIds);
```

## Cleanup
Always cleanup after tests:

```typescript
afterEach(async () => {
  await seeder.cleanup();
});
```

## Versioning
Test data factories are versioned with the codebase. Update factories when schema changes.

## Best Practices
- Use factories for all test data
- Keep factories simple and focused
- Override only necessary fields
- Cleanup after each test
- Commit factory changes with schema migrations
