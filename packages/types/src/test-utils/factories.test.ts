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
  type TestUser,
  type TestCourse,
  type TestEnrollment,
  type TestQuiz,
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
      expect(
        enrollment.completedAt === null || enrollment.completedAt instanceof Date,
      ).toBe(true);
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
