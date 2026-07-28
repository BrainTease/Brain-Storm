/**
 * Test factories for apps/backend/test (e2e & integration tests).
 *
 * All factory implementations now live in the shared
 * packages/types/src/test-utils module so that every workspace package
 * can import them from a single canonical location.
 *
 * Closes #861 — consolidate duplicate test fixtures into a shared
 * packages/types test-utils module.
 */
export {
  UserFactory,
  CourseFactory,
  EnrollmentFactory,
  QuizFactory,
} from '@brain-storm/types/test-utils';

export type {
  TestUser,
  TestCourse,
  TestEnrollment,
  TestQuiz,
  UserRole,
  EnrollmentStatus,
  CourseStatus,
} from '@brain-storm/types/test-utils';
