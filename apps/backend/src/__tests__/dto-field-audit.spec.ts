import { UserResponseDto, toUserResponseDto } from '../users/dto/user-response.dto';
import { CourseResponseDto, toCourseResponseDto } from '../courses/dto/course-response.dto';
import { RecordProgressDto } from '../progress/dto/record-progress.dto';

/**
 * Regression guard for the users/courses/progress DTO field audit
 * (docs/api/dto-field-audit.md). Pins the exact field set that is allowed
 * to leave the API so an internal/sensitive field can't silently
 * reappear on a response DTO, and so unused fields don't creep back in.
 */
describe('DTO field audit', () => {
  const EXPECTED_USER_FIELDS = [
    'id',
    'email',
    'username',
    'avatar',
    'bio',
    'stellarPublicKey',
    'role',
    'isBanned',
    'isVerified',
    'mfaEnabled',
    'referralCode',
    'referredBy',
    'createdAt',
    'updatedAt',
  ].sort();

  const FORBIDDEN_USER_FIELDS = [
    'passwordHash',
    'mfaSecret',
    'mfaBackupCodes',
    'verificationToken',
    'verificationTokenExpiresAt',
    'createdBy',
    'updatedBy',
  ];

  const EXPECTED_COURSE_FIELDS = [
    'id',
    'title',
    'description',
    'level',
    'durationHours',
    'status',
    'requiresKyc',
    'instructorId',
    'scheduledAt',
    'publishedAt',
    'averageRating',
    'createdAt',
    'updatedAt',
  ].sort();

  const FORBIDDEN_COURSE_FIELDS = [
    'isDeleted',
    'deletedAt',
    'isPublished',
    'createdBy',
    'updatedBy',
  ];

  const EXPECTED_PROGRESS_FIELDS = ['courseId', 'lessonId', 'progressPct'].sort();

  function fakeUser(): any {
    const now = new Date();
    return {
      id: 'u1',
      email: 'a@b.com',
      username: 'a',
      avatar: null,
      bio: null,
      stellarPublicKey: null,
      role: 'student',
      isBanned: false,
      isVerified: true,
      mfaEnabled: false,
      referralCode: null,
      referredBy: null,
      createdAt: now,
      updatedAt: now,
      passwordHash: 'secret',
      mfaSecret: 'secret',
      mfaBackupCodes: ['secret'],
      verificationToken: 'secret',
      verificationTokenExpiresAt: now,
      createdBy: 'system',
      updatedBy: 'system',
    };
  }

  function fakeCourse(): any {
    const now = new Date();
    return {
      id: 'c1',
      title: 't',
      description: 'd',
      level: 'beginner',
      durationHours: 1,
      status: 'published',
      requiresKyc: false,
      instructorId: null,
      scheduledAt: null,
      publishedAt: null,
      averageRating: null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
      isPublished: true,
      createdBy: 'system',
      updatedBy: 'system',
    };
  }

  it('UserResponseDto exposes exactly the audited field set', () => {
    const dto = toUserResponseDto(fakeUser());
    expect(Object.keys(dto).sort()).toEqual(EXPECTED_USER_FIELDS);
  });

  it('UserResponseDto never leaks sensitive/internal fields', () => {
    const dto: any = toUserResponseDto(fakeUser());
    for (const field of FORBIDDEN_USER_FIELDS) {
      expect(dto[field]).toBeUndefined();
    }
  });

  it('CourseResponseDto exposes exactly the audited field set', () => {
    const dto = toCourseResponseDto(fakeCourse());
    expect(Object.keys(dto).sort()).toEqual(EXPECTED_COURSE_FIELDS);
  });

  it('CourseResponseDto never leaks internal/operational fields', () => {
    const dto: any = toCourseResponseDto(fakeCourse());
    for (const field of FORBIDDEN_COURSE_FIELDS) {
      expect(dto[field]).toBeUndefined();
    }
  });

  it('RecordProgressDto only defines the fields the endpoint consumes', () => {
    const dto = new RecordProgressDto();
    dto.courseId = 'course-1';
    dto.lessonId = 'lesson-1';
    dto.progressPct = 50;
    expect(Object.keys(dto).sort()).toEqual(EXPECTED_PROGRESS_FIELDS);
  });
});
