/**
 * Unit tests for packages/types/src/test-utils/index.ts
 *
 * These tests verify that each factory:
 *  1. Produces an object with the correct shape (all required fields present).
 *  2. Applies overrides correctly.
 *  3. Returns independent objects on repeated calls (no shared mutable state).
 *  4. createMany() returns the right count and applies batch overrides.
 *
 * Closes #861 — consolidate duplicate test fixtures into a shared
 * packages/types test-utils module.
 */

import {
  UserFactory,
  CourseFactory,
  EnrollmentFactory,
  QuizFactory,
  CredentialFactory,
  ProgressFactory,
  PaymentFactory,
  type TestUser,
  type TestCourse,
  type TestEnrollment,
  type TestQuiz,
  type TestCredential,
  type TestProgress,
  type TestPayment,
} from './index';

// ---------------------------------------------------------------------------
// UserFactory
// ---------------------------------------------------------------------------

describe('UserFactory', () => {
  describe('create()', () => {
    it('returns an object with all required TestUser fields', () => {
      const user = UserFactory.create();
      expect(typeof user.id).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(typeof user.firstName).toBe('string');
      expect(typeof user.lastName).toBe('string');
      expect(typeof user.name).toBe('string');
      expect(typeof user.username).toBe('string');
      expect(typeof user.password).toBe('string');
      expect(['student', 'instructor', 'admin']).toContain(user.role);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('defaults role to "student"', () => {
      expect(UserFactory.create().role).toBe('student');
    });

    it('sets name as "firstName lastName" by default', () => {
      const user = UserFactory.create();
      expect(user.name).toBe(`${user.firstName} ${user.lastName}`);
    });

    it('applies role override', () => {
      const admin = UserFactory.create({ role: 'admin' });
      expect(admin.role).toBe('admin');
    });

    it('applies email override', () => {
      const user = UserFactory.create({ email: 'fixed@example.com' });
      expect(user.email).toBe('fixed@example.com');
    });

    it('keeps name consistent when firstName is overridden alone', () => {
      const user = UserFactory.create({ firstName: 'Alice' });
      expect(user.firstName).toBe('Alice');
      expect(user.name).toContain('Alice');
    });

    it('keeps name consistent when lastName is overridden alone', () => {
      const user = UserFactory.create({ lastName: 'Smith' });
      expect(user.lastName).toBe('Smith');
      expect(user.name).toContain('Smith');
    });

    it('honours explicit name override', () => {
      const user = UserFactory.create({ name: 'Custom Name' });
      expect(user.name).toBe('Custom Name');
    });

    it('produces unique ids on successive calls', () => {
      const a = UserFactory.create();
      const b = UserFactory.create();
      expect(a.id).not.toBe(b.id);
    });

    it('returns independent objects (mutations do not cross-contaminate)', () => {
      const a = UserFactory.create();
      const b = UserFactory.create();
      (a as TestUser).role = 'admin';
      expect(b.role).toBe('student');
    });
  });

  describe('createMany()', () => {
    it('returns exactly the requested count', () => {
      expect(UserFactory.createMany(5)).toHaveLength(5);
    });

    it('returns an empty array for count=0', () => {
      expect(UserFactory.createMany(0)).toHaveLength(0);
    });

    it('applies overrides to every element', () => {
      const instructors = UserFactory.createMany(3, { role: 'instructor' });
      instructors.forEach((u) => expect(u.role).toBe('instructor'));
    });

    it('returns objects with distinct ids', () => {
      const users = UserFactory.createMany(4);
      const ids = users.map((u) => u.id);
      expect(new Set(ids).size).toBe(4);
    });
  });
});

// ---------------------------------------------------------------------------
// CourseFactory
// ---------------------------------------------------------------------------

describe('CourseFactory', () => {
  describe('create()', () => {
    it('returns an object with all required TestCourse fields', () => {
      const course = CourseFactory.create();
      expect(typeof course.id).toBe('string');
      expect(typeof course.title).toBe('string');
      expect(typeof course.description).toBe('string');
      expect(typeof course.instructor).toBe('string');
      expect(typeof course.instructorId).toBe('string');
      expect(typeof course.duration).toBe('number');
      expect(typeof course.published).toBe('boolean');
      expect(['draft', 'scheduled', 'published']).toContain(course.status);
      expect(course.createdAt).toBeInstanceOf(Date);
      expect(course.updatedAt).toBeInstanceOf(Date);
    });

    it('defaults to published status', () => {
      const course = CourseFactory.create();
      expect(course.published).toBe(true);
      expect(course.status).toBe('published');
    });

    it('applies status override', () => {
      const draft = CourseFactory.create({ status: 'draft' });
      expect(draft.status).toBe('draft');
    });

    it('applies instructor override', () => {
      const course = CourseFactory.create({ instructor: 'Dr. Nakamoto' });
      expect(course.instructor).toBe('Dr. Nakamoto');
    });

    it('applies instructorId override', () => {
      const course = CourseFactory.create({ instructorId: 'uuid-abc' });
      expect(course.instructorId).toBe('uuid-abc');
    });

    it('produces unique ids on successive calls', () => {
      expect(CourseFactory.create().id).not.toBe(CourseFactory.create().id);
    });
  });

  describe('createMany()', () => {
    it('returns exactly the requested count', () => {
      expect(CourseFactory.createMany(7)).toHaveLength(7);
    });

    it('applies overrides to every element', () => {
      const drafts = CourseFactory.createMany(3, { status: 'draft', published: false });
      drafts.forEach((c) => {
        expect(c.status).toBe('draft');
        expect(c.published).toBe(false);
      });
    });

    it('returns objects with distinct ids', () => {
      const courses = CourseFactory.createMany(4);
      const ids = courses.map((c) => c.id);
      expect(new Set(ids).size).toBe(4);
    });
  });
});

// ---------------------------------------------------------------------------
// EnrollmentFactory
// ---------------------------------------------------------------------------

describe('EnrollmentFactory', () => {
  describe('create()', () => {
    it('returns an object with all required TestEnrollment fields', () => {
      const enrollment = EnrollmentFactory.create();
      expect(typeof enrollment.id).toBe('string');
      expect(typeof enrollment.userId).toBe('string');
      expect(typeof enrollment.courseId).toBe('string');
      expect(typeof enrollment.progress).toBe('number');
      expect(['active', 'completed', 'dropped']).toContain(enrollment.status);
      expect(enrollment.enrolledAt).toBeInstanceOf(Date);
      // completedAt is nullable
      expect(enrollment.completedAt === null || enrollment.completedAt instanceof Date).toBe(true);
    });

    it('defaults status to "active"', () => {
      expect(EnrollmentFactory.create().status).toBe('active');
    });

    it('defaults completedAt to null', () => {
      expect(EnrollmentFactory.create().completedAt).toBeNull();
    });

    it('progress is within 0–100', () => {
      for (let i = 0; i < 20; i++) {
        const { progress } = EnrollmentFactory.create();
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      }
    });

    it('applies status override', () => {
      const completed = EnrollmentFactory.create({ status: 'completed' });
      expect(completed.status).toBe('completed');
    });

    it('applies completedAt override', () => {
      const date = new Date('2025-01-01');
      const enrollment = EnrollmentFactory.create({ completedAt: date });
      expect(enrollment.completedAt).toEqual(date);
    });

    it('applies progress override', () => {
      const enrollment = EnrollmentFactory.create({ progress: 42 });
      expect(enrollment.progress).toBe(42);
    });

    it('produces unique ids on successive calls', () => {
      expect(EnrollmentFactory.create().id).not.toBe(EnrollmentFactory.create().id);
    });
  });

  describe('createMany()', () => {
    it('returns exactly the requested count', () => {
      expect(EnrollmentFactory.createMany(6)).toHaveLength(6);
    });

    it('applies overrides to every element', () => {
      const dropped = EnrollmentFactory.createMany(3, { status: 'dropped' });
      dropped.forEach((e) => expect(e.status).toBe('dropped'));
    });

    it('returns objects with distinct ids', () => {
      const enrollments = EnrollmentFactory.createMany(5);
      const ids = enrollments.map((e) => e.id);
      expect(new Set(ids).size).toBe(5);
    });
  });
});

// ---------------------------------------------------------------------------
// QuizFactory
// ---------------------------------------------------------------------------

describe('QuizFactory', () => {
  describe('create()', () => {
    it('returns an object with all required TestQuiz fields', () => {
      const quiz = QuizFactory.create();
      expect(typeof quiz.id).toBe('string');
      expect(typeof quiz.courseId).toBe('string');
      expect(typeof quiz.title).toBe('string');
      expect(typeof quiz.questions).toBe('number');
      expect(typeof quiz.passingScore).toBe('number');
      expect(quiz.createdAt).toBeInstanceOf(Date);
    });

    it('defaults passingScore to 70', () => {
      expect(QuizFactory.create().passingScore).toBe(70);
    });

    it('questions are within 5–20', () => {
      for (let i = 0; i < 20; i++) {
        const { questions } = QuizFactory.create();
        expect(questions).toBeGreaterThanOrEqual(5);
        expect(questions).toBeLessThanOrEqual(20);
      }
    });

    it('applies passingScore override', () => {
      const quiz = QuizFactory.create({ passingScore: 90 });
      expect(quiz.passingScore).toBe(90);
    });

    it('applies questions override', () => {
      const quiz = QuizFactory.create({ questions: 30 });
      expect(quiz.questions).toBe(30);
    });

    it('applies courseId override', () => {
      const quiz = QuizFactory.create({ courseId: 'course-xyz' });
      expect(quiz.courseId).toBe('course-xyz');
    });

    it('produces unique ids on successive calls', () => {
      expect(QuizFactory.create().id).not.toBe(QuizFactory.create().id);
    });
  });

  describe('createMany()', () => {
    it('returns exactly the requested count', () => {
      expect(QuizFactory.createMany(4)).toHaveLength(4);
    });

    it('applies overrides to every element', () => {
      const quizzes = QuizFactory.createMany(3, { passingScore: 80 });
      quizzes.forEach((q) => expect(q.passingScore).toBe(80));
    });

    it('returns objects with distinct ids', () => {
      const quizzes = QuizFactory.createMany(5);
      const ids = quizzes.map((q) => q.id);
      expect(new Set(ids).size).toBe(5);
    });
  });
});

// ---------------------------------------------------------------------------
// CredentialFactory
// ---------------------------------------------------------------------------

describe('CredentialFactory', () => {
  describe('create()', () => {
    it('returns an object with all required TestCredential fields', () => {
      const credential = CredentialFactory.create();
      expect(typeof credential.id).toBe('string');
      expect(typeof credential.userId).toBe('string');
      expect(typeof credential.courseId).toBe('string');
      expect(typeof credential.courseName).toBe('string');
      expect(['pending', 'issued', 'revoked']).toContain(credential.status);
      expect(
        credential.issuedAt === null || credential.issuedAt instanceof Date,
      ).toBe(true);
      expect(
        credential.txHash === null || typeof credential.txHash === 'string',
      ).toBe(true);
      expect(credential.createdAt).toBeInstanceOf(Date);
    });

    it('defaults status to "issued"', () => {
      expect(CredentialFactory.create().status).toBe('issued');
    });

    it('defaults issuedAt to a recent date', () => {
      const credential = CredentialFactory.create();
      expect(credential.issuedAt).toBeInstanceOf(Date);
    });

    it('defaults txHash to a non-null string', () => {
      const credential = CredentialFactory.create();
      expect(typeof credential.txHash).toBe('string');
    });

    it('applies status override', () => {
      const pending = CredentialFactory.create({ status: 'pending' });
      expect(pending.status).toBe('pending');
    });

    it('applies txHash override', () => {
      const credential = CredentialFactory.create({ txHash: 'abc123' });
      expect(credential.txHash).toBe('abc123');
    });

    it('applies null txHash override', () => {
      const credential = CredentialFactory.create({ txHash: null });
      expect(credential.txHash).toBeNull();
    });

    it('applies courseId override', () => {
      const credential = CredentialFactory.create({ courseId: 'course-xyz' });
      expect(credential.courseId).toBe('course-xyz');
    });

    it('produces unique ids on successive calls', () => {
      expect(CredentialFactory.create().id).not.toBe(CredentialFactory.create().id);
    });
  });

  describe('createMany()', () => {
    it('returns exactly the requested count', () => {
      expect(CredentialFactory.createMany(4)).toHaveLength(4);
    });

    it('applies overrides to every element', () => {
      const pending = CredentialFactory.createMany(3, { status: 'pending' });
      pending.forEach((c) => expect(c.status).toBe('pending'));
    });

    it('returns objects with distinct ids', () => {
      const credentials = CredentialFactory.createMany(5);
      const ids = credentials.map((c) => c.id);
      expect(new Set(ids).size).toBe(5);
    });
  });
});

// ---------------------------------------------------------------------------
// ProgressFactory
// ---------------------------------------------------------------------------

describe('ProgressFactory', () => {
  describe('create()', () => {
    it('returns an object with all required TestProgress fields', () => {
      const progress = ProgressFactory.create();
      expect(typeof progress.id).toBe('string');
      expect(typeof progress.userId).toBe('string');
      expect(typeof progress.courseId).toBe('string');
      expect(typeof progress.progressPct).toBe('number');
      expect(typeof progress.completed).toBe('boolean');
      expect(
        progress.txHash === null || typeof progress.txHash === 'string',
      ).toBe(true);
      expect(progress.updatedAt).toBeInstanceOf(Date);
    });

    it('progressPct is within 0–100', () => {
      for (let i = 0; i < 20; i++) {
        const { progressPct } = ProgressFactory.create();
        expect(progressPct).toBeGreaterThanOrEqual(0);
        expect(progressPct).toBeLessThanOrEqual(100);
      }
    });

    it('completed is true when progressPct is 100', () => {
      const progress = ProgressFactory.create({ progressPct: 100 });
      expect(progress.completed).toBe(true);
    });

    it('completed is false when progressPct is less than 100', () => {
      const progress = ProgressFactory.create({ progressPct: 50 });
      expect(progress.completed).toBe(false);
    });

    it('txHash is null when progressPct is 0', () => {
      const progress = ProgressFactory.create({ progressPct: 0 });
      expect(progress.txHash).toBeNull();
    });

    it('txHash is a string when progressPct > 0', () => {
      const progress = ProgressFactory.create({ progressPct: 25 });
      expect(typeof progress.txHash).toBe('string');
    });

    it('applies progressPct override', () => {
      const progress = ProgressFactory.create({ progressPct: 42 });
      expect(progress.progressPct).toBe(42);
    });

    it('applies completed override', () => {
      const progress = ProgressFactory.create({ completed: true, progressPct: 99 });
      expect(progress.completed).toBe(true);
    });

    it('applies courseId override', () => {
      const progress = ProgressFactory.create({ courseId: 'course-xyz' });
      expect(progress.courseId).toBe('course-xyz');
    });

    it('produces unique ids on successive calls', () => {
      expect(ProgressFactory.create().id).not.toBe(ProgressFactory.create().id);
    });
  });

  describe('createMany()', () => {
    it('returns exactly the requested count', () => {
      expect(ProgressFactory.createMany(6)).toHaveLength(6);
    });

    it('applies overrides to every element', () => {
      const completed = ProgressFactory.createMany(3, { progressPct: 100, completed: true });
      completed.forEach((p) => {
        expect(p.progressPct).toBe(100);
        expect(p.completed).toBe(true);
      });
    });

    it('returns objects with distinct ids', () => {
      const progressList = ProgressFactory.createMany(5);
      const ids = progressList.map((p) => p.id);
      expect(new Set(ids).size).toBe(5);
    });
  });
});

// ---------------------------------------------------------------------------
// PaymentFactory
// ---------------------------------------------------------------------------

describe('PaymentFactory', () => {
  describe('create()', () => {
    it('returns an object with all required TestPayment fields', () => {
      const payment = PaymentFactory.create();
      expect(typeof payment.id).toBe('string');
      expect(typeof payment.userId).toBe('string');
      expect(typeof payment.courseId).toBe('string');
      expect(typeof payment.amount).toBe('number');
      expect(typeof payment.currency).toBe('string');
      expect(['pending', 'completed', 'failed', 'refunded']).toContain(payment.status);
      expect(['stripe', 'stellar']).toContain(payment.provider);
      expect(
        payment.providerSessionId === null || typeof payment.providerSessionId === 'string',
      ).toBe(true);
      expect(
        payment.txHash === null || typeof payment.txHash === 'string',
      ).toBe(true);
      expect(payment.createdAt).toBeInstanceOf(Date);
    });

    it('defaults status to "completed"', () => {
      expect(PaymentFactory.create().status).toBe('completed');
    });

    it('defaults provider to "stripe"', () => {
      expect(PaymentFactory.create().provider).toBe('stripe');
    });

    it('defaults currency to "usd"', () => {
      expect(PaymentFactory.create().currency).toBe('usd');
    });

    it('amount is positive', () => {
      for (let i = 0; i < 20; i++) {
        expect(PaymentFactory.create().amount).toBeGreaterThan(0);
      }
    });

    it('applies amount override', () => {
      const payment = PaymentFactory.create({ amount: 4999 });
      expect(payment.amount).toBe(4999);
    });

    it('applies status override', () => {
      const payment = PaymentFactory.create({ status: 'failed' });
      expect(payment.status).toBe('failed');
    });

    it('applies provider override to stellar', () => {
      const payment = PaymentFactory.create({ provider: 'stellar', txHash: 'tx123' });
      expect(payment.provider).toBe('stellar');
      expect(payment.txHash).toBe('tx123');
    });

    it('applies courseId override', () => {
      const payment = PaymentFactory.create({ courseId: 'course-xyz' });
      expect(payment.courseId).toBe('course-xyz');
    });

    it('produces unique ids on successive calls', () => {
      expect(PaymentFactory.create().id).not.toBe(PaymentFactory.create().id);
    });
  });

  describe('createMany()', () => {
    it('returns exactly the requested count', () => {
      expect(PaymentFactory.createMany(4)).toHaveLength(4);
    });

    it('applies overrides to every element', () => {
      const refunds = PaymentFactory.createMany(3, { status: 'refunded' });
      refunds.forEach((p) => expect(p.status).toBe('refunded'));
    });

    it('returns objects with distinct ids', () => {
      const payments = PaymentFactory.createMany(5);
      const ids = payments.map((p) => p.id);
      expect(new Set(ids).size).toBe(5);
    });
  });
});
