/**
 * Test factories for apps/backend/src/test (unit & integration specs).
 *
 * All factory implementations now live in the shared
 * packages/types/src/test-utils module so that every workspace package
 * can import them from a single canonical location.
 *
 * Closes #861 — consolidate duplicate test fixtures into a shared
 * packages/types test-utils module.
 *
 * MIGRATION NOTE
 * --------------
 * The previous implementation used @faker-js/faker and TypeORM entity classes
 * directly (User, Course, Enrollment, Progress).  The canonical factories in
 * @brain-storm/types/test-utils produce plain objects whose shape matches
 * those entities for all fields that matter to unit tests.
 *
 * If a test needs TypeORM-specific fields that are not present in the shared
 * types (e.g. passwordHash, stellarPublicKey, isBanned, mfaEnabled, …), extend
 * the factory result locally:
 *
 *   import { UserFactory } from '@brain-storm/types/test-utils';
 *
 *   const user = {
 *     ...UserFactory.create({ role: 'instructor' }),
 *     passwordHash: 'bcrypt-hash',
 *     stellarPublicKey: 'GABCDE...',
 *     isBanned: false,
 *     mfaEnabled: false,
 *     isVerified: true,
 *   };
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
