# Shared Test Factories

This directory provides shared test factory helpers for the Brain-Storm monorepo, closing #1031.

## Available Factories

| Factory | Interface | Purpose |
|---------|-----------|---------|
| `UserFactory` | `TestUser` | Create test user objects with role, email, name |
| `CourseFactory` | `TestCourse` | Create test course objects with status, instructor |
| `EnrollmentFactory` | `TestEnrollment` | Create test enrollment objects with progress, status |
| `QuizFactory` | `TestQuiz` | Create test quiz objects with questions, passing score |
| `CredentialFactory` | `TestCredential` | Create test credential/certificate objects with txHash |
| `ProgressFactory` | `TestProgress` | Create test progress objects with completion percentage |
| `PaymentFactory` | `TestPayment` | Create test payment objects with amount, provider, status |

## Usage

```typescript
import {
  UserFactory,
  CourseFactory,
  EnrollmentFactory,
  CredentialFactory,
  ProgressFactory,
  PaymentFactory,
} from '@brain-storm/types/test-utils';

// Create a single object with defaults
const user = UserFactory.create();

// Create with overrides
const admin = UserFactory.create({ role: 'admin', email: 'admin@example.com' });
const draft = CourseFactory.create({ status: 'draft', published: false });
const completed = ProgressFactory.create({ progressPct: 100, completed: true });

// Create multiple objects
const students = UserFactory.createMany(10, { role: 'student' });
const courses = CourseFactory.createMany(5);

// Cross-entity relationships
const userId = 'user-123';
const courseId = 'course-456';
const enrollment = EnrollmentFactory.create({ userId, courseId, progress: 75 });
const progress = ProgressFactory.create({ userId, courseId, progressPct: 75 });
const credential = CredentialFactory.create({ userId, courseId, status: 'pending' });
const payment = PaymentFactory.create({ userId, courseId, amount: 4999 });
```

## Conventions

1. **Use overrides for specific values** — Don't rely on random defaults for assertions. Override fields you need to assert on.

2. **Keep relationships explicit** — When testing related entities, pass the same `userId`/`courseId` to multiple factories rather than letting them generate independent IDs.

3. **Don't mutate factory output** — Each call returns an independent object. Mutations won't affect other objects.

4. **Prefer factories over inline objects** — Replace inline test data like `{ id: '1', email: 'test@example.com' } as User` with `UserFactory.create({ id: '1', email: 'test@example.com' })`.

## Adding New Factories

To add a new factory:

1. Define the interface in `packages/types/src/test-utils/index.ts`
2. Create a factory class with `create()` and `createMany()` methods
3. Accept `Partial<T>` overrides with sensible defaults
4. Add tests in `factories.test.ts`
5. Export from the index
