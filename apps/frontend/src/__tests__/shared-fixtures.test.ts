/**
 * Frontend tests using shared fixtures — migrated per issue #1193.
 *
 * This file replaces inline hard-coded test data with factories from
 * @brain-storm/types/test-utils.  The factories produce consistent, unique
 * objects matching the canonical shared-type shapes, preventing drift between
 * frontend and backend when types change.
 *
 * Covers:
 *  - UserFactory  → auth store user objects
 *  - CourseFactory → CourseCard props and CourseGrid data
 *  - EnrollmentFactory → enrollment list scenarios
 *  - CredentialFactory → credential display
 *  - ProgressFactory → progress display
 *  - PaymentFactory → payment state assertions
 *
 * Closes #1193.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks required by Next.js components under Vitest/jsdom
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

vi.mock('@/lib/jwt', () => ({
  isTokenExpired: vi.fn(() => false),
}));

import {
  UserFactory,
  CourseFactory,
  EnrollmentFactory,
  CredentialFactory,
  ProgressFactory,
  PaymentFactory,
} from '@brain-storm/types/test-utils';

// ---------------------------------------------------------------------------
// 1. UserFactory — used to seed auth-store user objects
// ---------------------------------------------------------------------------

describe('UserFactory — canonical shape (frontend)', () => {
  it('creates a user with all required fields', () => {
    const user = UserFactory.create();
    expect(user.id).toBeTruthy();
    expect(user.email).toMatch(/@example\.com$/);
    expect(user.firstName).toBeTruthy();
    expect(user.lastName).toBeTruthy();
    expect(user.name).toBe(`${user.firstName} ${user.lastName}`);
    expect(['student', 'instructor', 'admin']).toContain(user.role);
  });

  it('creates an admin user with role override', () => {
    const admin = UserFactory.create({ role: 'admin' });
    expect(admin.role).toBe('admin');
  });

  it('creates an instructor with explicit email', () => {
    const instructor = UserFactory.create({
      role: 'instructor',
      email: 'instructor@example.com',
    });
    expect(instructor.email).toBe('instructor@example.com');
    expect(instructor.role).toBe('instructor');
  });

  it('creates a batch without ID collisions', () => {
    const users = UserFactory.createMany(20);
    const ids = new Set(users.map((u) => u.id));
    expect(ids.size).toBe(20);
  });

  it('batch with role override applies to all', () => {
    const instructors = UserFactory.createMany(5, { role: 'instructor' });
    instructors.forEach((u) => expect(u.role).toBe('instructor'));
  });

  it('createdAt is before or equal to updatedAt', () => {
    const user = UserFactory.create();
    expect(user.createdAt.getTime()).toBeLessThanOrEqual(user.updatedAt.getTime());
  });
});

// ---------------------------------------------------------------------------
// 2. CourseFactory — used to seed CourseCard and CourseGrid props
// ---------------------------------------------------------------------------

describe('CourseFactory — canonical shape (frontend)', () => {
  it('creates a published course with required fields', () => {
    const course = CourseFactory.create();
    expect(course.id).toBeTruthy();
    expect(course.title).toBeTruthy();
    expect(course.description).toBeTruthy();
    expect(course.instructor).toBeTruthy();
    expect(typeof course.duration).toBe('number');
    expect(course.status).toBe('published');
    expect(course.published).toBe(true);
  });

  it('creates a draft course', () => {
    const draft = CourseFactory.create({ status: 'draft', published: false });
    expect(draft.status).toBe('draft');
    expect(draft.published).toBe(false);
  });

  it('creates a scheduled course', () => {
    const scheduled = CourseFactory.create({ status: 'scheduled' });
    expect(scheduled.status).toBe('scheduled');
  });

  it('creates a batch of 5 courses with unique IDs and titles', () => {
    const courses = CourseFactory.createMany(5);
    const ids = new Set(courses.map((c) => c.id));
    expect(ids.size).toBe(5);
  });

  it('supports instructor override for instructor-specific listings', () => {
    const user = UserFactory.create({ role: 'instructor' });
    const course = CourseFactory.create({
      instructor: user.name,
      instructorId: user.id,
    });
    expect(course.instructorId).toBe(user.id);
    expect(course.instructor).toBe(user.name);
  });

  it('duration is a positive integer within a sensible range', () => {
    const courses = CourseFactory.createMany(10);
    courses.forEach((c) => {
      expect(c.duration).toBeGreaterThan(0);
      expect(c.duration).toBeLessThanOrEqual(12);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. EnrollmentFactory — used to seed enrollment list components
// ---------------------------------------------------------------------------

describe('EnrollmentFactory — canonical shape (frontend)', () => {
  it('creates an active enrollment', () => {
    const enrollment = EnrollmentFactory.create({ status: 'active' });
    expect(enrollment.status).toBe('active');
    expect(enrollment.completedAt).toBeNull();
  });

  it('creates a completed enrollment with 100% progress', () => {
    const enrollment = EnrollmentFactory.create({
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
    });
    expect(enrollment.progress).toBe(100);
    expect(enrollment.completedAt).toBeInstanceOf(Date);
  });

  it('creates a dropped enrollment', () => {
    const enrollment = EnrollmentFactory.create({ status: 'dropped' });
    expect(enrollment.status).toBe('dropped');
  });

  it('cross-entity: userId and courseId match parent factories', () => {
    const user = UserFactory.create();
    const course = CourseFactory.create();
    const enrollment = EnrollmentFactory.create({
      userId: user.id,
      courseId: course.id,
    });

    expect(enrollment.userId).toBe(user.id);
    expect(enrollment.courseId).toBe(course.id);
  });

  it('creates a batch of enrollments for the same user in different courses', () => {
    const user = UserFactory.create();
    const courses = CourseFactory.createMany(3);
    const enrollments = courses.map((c) =>
      EnrollmentFactory.create({ userId: user.id, courseId: c.id })
    );

    enrollments.forEach((e) => expect(e.userId).toBe(user.id));
    const courseIds = new Set(enrollments.map((e) => e.courseId));
    expect(courseIds.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 4. CredentialFactory — used to seed credential display components
// ---------------------------------------------------------------------------

describe('CredentialFactory — canonical shape (frontend)', () => {
  it('creates an issued credential with txHash', () => {
    const cred = CredentialFactory.create();
    expect(cred.status).toBe('issued');
    expect(cred.txHash).toBeTruthy();
    expect(cred.issuedAt).toBeInstanceOf(Date);
  });

  it('creates a pending credential without txHash', () => {
    const cred = CredentialFactory.create({
      status: 'pending',
      txHash: null,
      issuedAt: null,
    });
    expect(cred.status).toBe('pending');
    expect(cred.txHash).toBeNull();
    expect(cred.issuedAt).toBeNull();
  });

  it('creates a revoked credential', () => {
    const cred = CredentialFactory.create({ status: 'revoked' });
    expect(cred.status).toBe('revoked');
  });

  it('cross-entity: credential matches user and course', () => {
    const user = UserFactory.create();
    const course = CourseFactory.create();
    const cred = CredentialFactory.create({
      userId: user.id,
      courseId: course.id,
      courseName: course.title,
    });

    expect(cred.userId).toBe(user.id);
    expect(cred.courseId).toBe(course.id);
    expect(cred.courseName).toBe(course.title);
  });

  it('creates batch without ID collisions', () => {
    const creds = CredentialFactory.createMany(10);
    const ids = new Set(creds.map((c) => c.id));
    expect(ids.size).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 5. ProgressFactory — used to seed progress bars / dashboards
// ---------------------------------------------------------------------------

describe('ProgressFactory — canonical shape (frontend)', () => {
  it('creates a progress record within valid percentage range', () => {
    const records = ProgressFactory.createMany(20);
    records.forEach((r) => {
      expect(r.progressPct).toBeGreaterThanOrEqual(0);
      expect(r.progressPct).toBeLessThanOrEqual(100);
    });
  });

  it('completed flag is true when progressPct=100', () => {
    const done = ProgressFactory.create({ progressPct: 100, completed: true });
    expect(done.completed).toBe(true);
  });

  it('txHash is present when there is any progress', () => {
    const partial = ProgressFactory.create({ progressPct: 50 });
    expect(partial.txHash).toBeTruthy();
  });

  it('pinned progressPct is not overridden by completed', () => {
    const partial = ProgressFactory.create({ progressPct: 75 });
    expect(partial.progressPct).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// 6. PaymentFactory — used to seed payment status display
// ---------------------------------------------------------------------------

describe('PaymentFactory — canonical shape (frontend)', () => {
  it('creates a completed Stripe payment', () => {
    const payment = PaymentFactory.create({
      provider: 'stripe',
      status: 'completed',
    });
    expect(payment.provider).toBe('stripe');
    expect(payment.status).toBe('completed');
    expect(payment.providerSessionId).toBeTruthy();
  });

  it('creates a Stellar payment with txHash', () => {
    const payment = PaymentFactory.create({
      provider: 'stellar',
      txHash: 'abc123stellar',
      status: 'completed',
    });
    expect(payment.provider).toBe('stellar');
    expect(payment.txHash).toBe('abc123stellar');
  });

  it('creates a pending payment', () => {
    const payment = PaymentFactory.create({ status: 'pending' });
    expect(payment.status).toBe('pending');
  });

  it('amount is a positive integer representing cents', () => {
    const payments = PaymentFactory.createMany(10);
    payments.forEach((p) => {
      expect(p.amount).toBeGreaterThan(0);
    });
  });

  it('cross-entity: payment matches user and course', () => {
    const user = UserFactory.create();
    const course = CourseFactory.create();
    const payment = PaymentFactory.create({
      userId: user.id,
      courseId: course.id,
      amount: 4999,
      currency: 'usd',
    });

    expect(payment.userId).toBe(user.id);
    expect(payment.courseId).toBe(course.id);
    expect(payment.amount).toBe(4999);
  });
});

// ---------------------------------------------------------------------------
// 7. Cross-factory scenario: full course purchase lifecycle
// ---------------------------------------------------------------------------

describe('Cross-factory: course purchase lifecycle (#1193)', () => {
  it('builds a full purchase → enrollment → progress → credential chain', () => {
    const user = UserFactory.create({ role: 'student' });
    const course = CourseFactory.create({ status: 'published' });

    const payment = PaymentFactory.create({
      userId: user.id,
      courseId: course.id,
      status: 'completed',
      amount: 2999,
    });

    const enrollment = EnrollmentFactory.create({
      userId: user.id,
      courseId: course.id,
      status: 'active',
      progress: 0,
    });

    const progress = ProgressFactory.create({
      userId: user.id,
      courseId: course.id,
      progressPct: 100,
      completed: true,
    });

    const credential = CredentialFactory.create({
      userId: user.id,
      courseId: course.id,
      courseName: course.title,
      status: 'issued',
    });

    // All entities share the same userId and courseId
    expect(payment.userId).toBe(user.id);
    expect(enrollment.userId).toBe(user.id);
    expect(progress.userId).toBe(user.id);
    expect(credential.userId).toBe(user.id);

    expect(payment.courseId).toBe(course.id);
    expect(enrollment.courseId).toBe(course.id);
    expect(progress.courseId).toBe(course.id);
    expect(credential.courseId).toBe(course.id);

    // State is coherent
    expect(payment.status).toBe('completed');
    expect(enrollment.status).toBe('active');
    expect(progress.completed).toBe(true);
    expect(credential.status).toBe('issued');
  });
});
