/**
 * @module test-utils
 *
 * Shared test factory helpers for the Brain-Storm monorepo.
 *
 * All factories are pure functions — they generate self-consistent in-memory
 * objects that match the canonical shapes defined in packages/types.  Each
 * factory accepts an optional `overrides` argument so callers can pin specific
 * fields while keeping the rest randomised.
 *
 * Usage:
 *   import { UserFactory, CourseFactory, EnrollmentFactory, QuizFactory } from '@brain-storm/types/test-utils';
 *
 *   const user = UserFactory.create({ role: 'instructor' });
 *   const users = UserFactory.createMany(5);
 */

// ---------------------------------------------------------------------------
// Minimal deterministic pseudo-random helpers
// (avoids a hard dependency on @faker-js/faker at the types package level
//  while still producing unique values in every call)
// ---------------------------------------------------------------------------

let _counter = 0;
function nextId(): string {
  _counter += 1;
  return `test-id-${_counter}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomEmail(): string {
  return `user_${nextId()}@example.com`;
}

function randomWords(n: number): string {
  const pool = [
    'blockchain', 'stellar', 'smart', 'contract', 'token', 'ledger',
    'credential', 'course', 'learning', 'web3', 'crypto', 'defi',
    'soroban', 'wasm', 'node', 'module', 'lesson', 'quiz', 'reward',
  ];
  return Array.from({ length: n }, (_, i) => pool[(i + _counter) % pool.length]).join(' ');
}

function randomSentence(): string {
  return `${randomWords(6)}.`;
}

function randomParagraph(): string {
  return Array.from({ length: 3 }, () => randomSentence()).join(' ');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPast(): Date {
  return new Date(Date.now() - randomInt(1, 365) * 24 * 60 * 60 * 1000);
}

function randomRecent(): Date {
  return new Date(Date.now() - randomInt(0, 7) * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Type definitions matching the canonical shapes in packages/types/src
// ---------------------------------------------------------------------------

export type UserRole = 'student' | 'instructor' | 'admin';
export type EnrollmentStatus = 'active' | 'completed' | 'dropped';
export type CourseStatus = 'draft' | 'scheduled' | 'published';

/**
 * Canonical test User shape.
 *
 * Merges the fields from both previous factory locations:
 *  - apps/backend/tests/factories  (username, firstName, lastName)
 *  - apps/backend/test/factories   (name, password, updatedAt)
 *
 * All fields are present so either consumer can destructure what it needs.
 */
export interface TestUser {
  id: string;
  email: string;
  /** Structured first name (canonical) */
  firstName: string;
  /** Structured last name (canonical) */
  lastName: string;
  /** Convenience: `${firstName} ${lastName}` — kept for legacy consumers */
  name: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Canonical test Course shape.
 *
 * Merges the fields from both previous factory locations:
 *  - apps/backend/tests/factories  (instructor, duration, published)
 *  - apps/backend/test/factories   (instructorId, status, updatedAt)
 */
export interface TestCourse {
  id: string;
  title: string;
  description: string;
  /** Full name string — kept for legacy consumers of tests/factories */
  instructor: string;
  /** UUID reference — kept for legacy consumers of test/factories */
  instructorId: string;
  duration: number;
  published: boolean;
  status: CourseStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Canonical test Enrollment shape.
 *
 * Combines fields from both locations (completedAt added from test/factories).
 */
export interface TestEnrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt: Date | null;
}

/**
 * Quiz shape — originally only in apps/backend/test/factories.
 */
export interface TestQuiz {
  id: string;
  courseId: string;
  title: string;
  questions: number;
  passingScore: number;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Factory for creating test User objects.
 *
 * @example
 * const student = UserFactory.create();
 * const admin   = UserFactory.create({ role: 'admin' });
 * const batch   = UserFactory.createMany(10, { role: 'instructor' });
 */
export class UserFactory {
  static create(overrides: Partial<TestUser> = {}): TestUser {
    const firstName = overrides.firstName ?? `First${nextId()}`;
    const lastName  = overrides.lastName  ?? `Last${nextId()}`;
    // Derive name once so the object literal only sets it in one place.
    // If the caller overrides firstName or lastName without providing an
    // explicit name, the derived value below will still be correct because
    // we use the already-resolved firstName/lastName values.
    const name = overrides.name ?? `${firstName} ${lastName}`;
    return {
      id:        nextId(),
      email:     randomEmail(),
      firstName,
      lastName,
      name,
      username:  `user_${nextId()}`,
      password:  `pwd_${nextId()}`,
      role:      'student',
      createdAt: randomPast(),
      updatedAt: randomRecent(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

/**
 * Factory for creating test Course objects.
 *
 * @example
 * const course   = CourseFactory.create({ status: 'draft' });
 * const courses  = CourseFactory.createMany(3);
 */
export class CourseFactory {
  static create(overrides: Partial<TestCourse> = {}): TestCourse {
    const instructor   = overrides.instructor   ?? `Instructor ${nextId()}`;
    const instructorId = overrides.instructorId ?? nextId();
    return {
      id:           nextId(),
      title:        randomWords(3),
      description:  randomParagraph(),
      instructor,
      instructorId,
      duration:     randomInt(1, 12),
      published:    true,
      status:       'published',
      createdAt:    randomPast(),
      updatedAt:    randomRecent(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestCourse> = {}): TestCourse[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

/**
 * Factory for creating test Enrollment objects.
 *
 * @example
 * const enrollment = EnrollmentFactory.create({ status: 'completed', progress: 100 });
 */
export class EnrollmentFactory {
  static create(overrides: Partial<TestEnrollment> = {}): TestEnrollment {
    return {
      id:          nextId(),
      userId:      nextId(),
      courseId:    nextId(),
      progress:    randomInt(0, 100),
      status:      'active',
      enrolledAt:  randomPast(),
      completedAt: null,
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestEnrollment> = {}): TestEnrollment[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

/**
 * Factory for creating test Quiz objects.
 *
 * @example
 * const quiz  = QuizFactory.create({ passingScore: 80 });
 * const quizzes = QuizFactory.createMany(4);
 */
export class QuizFactory {
  static create(overrides: Partial<TestQuiz> = {}): TestQuiz {
    return {
      id:           nextId(),
      courseId:     nextId(),
      title:        randomWords(2),
      questions:    randomInt(5, 20),
      passingScore: 70,
      createdAt:    randomPast(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestQuiz> = {}): TestQuiz[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

// ── Credential Factory ────────────────────────────────────────────────────────

export type CredentialStatus = 'pending' | 'issued' | 'revoked';

/**
 * Canonical test Credential shape.
 *
 * Covers the on-chain credential issued upon course completion, including
 * the Stellar transaction hash that anchors the credential on-chain.
 */
export interface TestCredential {
  id: string;
  userId: string;
  courseId: string;
  courseName: string;
  status: CredentialStatus;
  issuedAt: Date | null;
  txHash: string | null;
  createdAt: Date;
}

/**
 * Factory for creating test Credential objects.
 *
 * @example
 * const credential  = CredentialFactory.create();
 * const issued      = CredentialFactory.create({ status: 'issued', txHash: 'abc123' });
 * const credentials = CredentialFactory.createMany(3, { status: 'pending' });
 */
export class CredentialFactory {
  static create(overrides: Partial<TestCredential> = {}): TestCredential {
    return {
      id:         nextId(),
      userId:     nextId(),
      courseId:   nextId(),
      courseName: randomWords(3),
      status:     'issued',
      issuedAt:   randomRecent(),
      txHash:     `tx_${nextId()}`,
      createdAt:  randomPast(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestCredential> = {}): TestCredential[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

// ── Progress Factory ──────────────────────────────────────────────────────────

/**
 * Canonical test Progress shape.
 *
 * Tracks a student's completion percentage for a specific course.
 */
export interface TestProgress {
  id: string;
  userId: string;
  courseId: string;
  progressPct: number;
  completed: boolean;
  txHash: string | null;
  updatedAt: Date;
}

/**
 * Factory for creating test Progress objects.
 *
 * @example
 * const progress  = ProgressFactory.create({ progressPct: 75 });
 * const completed = ProgressFactory.create({ progressPct: 100, completed: true });
 * const progressList = ProgressFactory.createMany(5);
 */
export class ProgressFactory {
  static create(overrides: Partial<TestProgress> = {}): TestProgress {
    const progressPct = overrides.progressPct ?? randomInt(0, 100);
    return {
      id:          nextId(),
      userId:      nextId(),
      courseId:    nextId(),
      progressPct,
      completed:   progressPct === 100,
      txHash:      progressPct > 0 ? `tx_${nextId()}` : null,
      updatedAt:   randomRecent(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestProgress> = {}): TestProgress[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

// ── Payment Factory ───────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Canonical test Payment shape.
 *
 * Represents a payment record for course purchase (Stripe or Stellar).
 */
export interface TestPayment {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: 'stripe' | 'stellar';
  providerSessionId: string | null;
  txHash: string | null;
  createdAt: Date;
}

/**
 * Factory for creating test Payment objects.
 *
 * @example
 * const payment  = PaymentFactory.create({ amount: 4999, currency: 'usd' });
 * const stellar  = PaymentFactory.create({ provider: 'stellar', txHash: 'abc123' });
 * const payments = PaymentFactory.createMany(3, { status: 'completed' });
 */
export class PaymentFactory {
  static create(overrides: Partial<TestPayment> = {}): TestPayment {
    return {
      id:                nextId(),
      userId:            nextId(),
      courseId:          nextId(),
      amount:            randomInt(999, 9999),
      currency:          'usd',
      status:            'completed',
      provider:          'stripe',
      providerSessionId: `cs_${nextId()}`,
      txHash:            null,
      createdAt:         randomPast(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<TestPayment> = {}): TestPayment[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
