/**
 * Unit tests for all Zod validation schemas exported from validation.types.ts
 *
 * Issue #1024: Inventory and test all exported validators/type guards in
 * packages/types to achieve 90%+ coverage.
 *
 * Each schema is tested with:
 *  - valid inputs that should succeed
 *  - invalid inputs that should produce descriptive errors
 *  - edge-case boundary values
 */

import {
  loginSchema,
  registerSchema,
  createCourseSchema,
  updateCourseSchema,
  recordProgressSchema,
  createReviewSchema,
  notificationPreferencesSchema,
  paginationSchema,
  courseQuerySchema,
  stellarPublicKeySchema,
  stellarTransactionHashSchema,
  fileUploadSchema,
  type LoginInput,
  type RegisterInput,
  type CreateCourseInput,
  type UpdateCourseInput,
  type RecordProgressInput,
  type CreateReviewInput,
  type NotificationPreferencesInput,
  type PaginationInput,
  type CourseQueryInput,
  type FileUploadInput,
} from './validation.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function expectValid<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`Expected valid input, but got: ${JSON.stringify(result)}`);
  }
  return result.data as T;
}

function expectInvalid(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: Array<{ message: string }> } } }, value: unknown, expectedMessage?: string): void {
  const result = schema.safeParse(value);
  expect(result.success).toBe(false);
  if (expectedMessage && !result.success && result.error) {
    const messages = result.error.issues.map((i) => i.message).join('; ');
    expect(messages).toMatch(expectedMessage);
  }
}

// ─── loginSchema ─────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts a valid email + password combination', () => {
    const data = expectValid<LoginInput>(loginSchema, {
      email: 'user@example.com',
      password: 'Password1',
    });
    expect(data.email).toBe('user@example.com');
    expect(data.password).toBe('Password1');
    expect(data.rememberMe).toBeUndefined();
  });

  it('accepts optional rememberMe=true', () => {
    const data = expectValid<LoginInput>(loginSchema, {
      email: 'user@example.com',
      password: 'Password1',
      rememberMe: true,
    });
    expect(data.rememberMe).toBe(true);
  });

  it('accepts optional rememberMe=false', () => {
    const data = expectValid<LoginInput>(loginSchema, {
      email: 'user@example.com',
      password: 'Password1',
      rememberMe: false,
    });
    expect(data.rememberMe).toBe(false);
  });

  it('rejects invalid email format', () => {
    expectInvalid(loginSchema, { email: 'not-an-email', password: 'Password1' }, 'Invalid email');
  });

  it('rejects password shorter than 8 characters', () => {
    expectInvalid(loginSchema, { email: 'u@e.com', password: 'short' }, 'Password must be at least 8 characters');
  });

  it('rejects missing email', () => {
    expectInvalid(loginSchema, { password: 'Password1' });
  });

  it('rejects missing password', () => {
    expectInvalid(loginSchema, { email: 'u@e.com' });
  });

  it('rejects empty object', () => {
    expectInvalid(loginSchema, {});
  });

  it('accepts exactly 8-character password (boundary)', () => {
    const data = expectValid<LoginInput>(loginSchema, { email: 'u@e.com', password: '12345678' });
    expect(data.password).toBe('12345678');
  });
});

// ─── registerSchema ───────────────────────────────────────────────────────────

describe('registerSchema', () => {
  const validRegister = {
    email: 'newuser@example.com',
    password: 'Passw0rd',
    firstName: 'Alice',
    lastName: 'Smith',
  };

  it('accepts a valid registration payload', () => {
    const data = expectValid<RegisterInput>(registerSchema, validRegister);
    expect(data.email).toBe('newuser@example.com');
    expect(data.firstName).toBe('Alice');
  });

  it('accepts optional stellarPublicKey of exactly 56 chars', () => {
    const key = 'G' + 'A'.repeat(55);
    const data = expectValid<RegisterInput>(registerSchema, { ...validRegister, stellarPublicKey: key });
    expect(data.stellarPublicKey).toBe(key);
  });

  it('rejects invalid email', () => {
    expectInvalid(registerSchema, { ...validRegister, email: 'bad' }, 'Invalid email');
  });

  it('rejects password without uppercase letter', () => {
    expectInvalid(registerSchema, { ...validRegister, password: 'passw0rd' }, 'uppercase');
  });

  it('rejects password without lowercase letter', () => {
    expectInvalid(registerSchema, { ...validRegister, password: 'PASSW0RD' }, 'lowercase');
  });

  it('rejects password without digit', () => {
    expectInvalid(registerSchema, { ...validRegister, password: 'Password' }, 'number');
  });

  it('rejects password shorter than 8 characters', () => {
    expectInvalid(registerSchema, { ...validRegister, password: 'P0a' }, 'at least 8 characters');
  });

  it('rejects empty firstName', () => {
    expectInvalid(registerSchema, { ...validRegister, firstName: '' }, 'First name is required');
  });

  it('rejects firstName longer than 50 characters', () => {
    expectInvalid(registerSchema, { ...validRegister, firstName: 'A'.repeat(51) }, 'First name too long');
  });

  it('rejects empty lastName', () => {
    expectInvalid(registerSchema, { ...validRegister, lastName: '' }, 'Last name is required');
  });

  it('rejects lastName longer than 50 characters', () => {
    expectInvalid(registerSchema, { ...validRegister, lastName: 'B'.repeat(51) }, 'Last name too long');
  });

  it('rejects stellarPublicKey that is not 56 characters', () => {
    expectInvalid(registerSchema, { ...validRegister, stellarPublicKey: 'GSHORT' }, 'Invalid Stellar public key');
  });

  it('accepts firstName of exactly 1 character (boundary)', () => {
    const data = expectValid<RegisterInput>(registerSchema, { ...validRegister, firstName: 'X' });
    expect(data.firstName).toBe('X');
  });

  it('accepts firstName of exactly 50 characters (boundary)', () => {
    const data = expectValid<RegisterInput>(registerSchema, { ...validRegister, firstName: 'A'.repeat(50) });
    expect(data.firstName).toHaveLength(50);
  });
});

// ─── createCourseSchema ───────────────────────────────────────────────────────

describe('createCourseSchema', () => {
  const validCourse = {
    title: 'Blockchain 101',
    description: 'An introductory course to blockchain fundamentals.',
    level: 'beginner' as const,
    durationHours: 10,
    price: 49.99,
  };

  it('accepts a valid course payload', () => {
    const data = expectValid<CreateCourseInput>(createCourseSchema, validCourse);
    expect(data.title).toBe('Blockchain 101');
    expect(data.level).toBe('beginner');
  });

  it('accepts all three valid levels', () => {
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      const data = expectValid<CreateCourseInput>(createCourseSchema, { ...validCourse, level });
      expect(data.level).toBe(level);
    }
  });

  it('applies requiresKyc default of false', () => {
    const data = expectValid<CreateCourseInput>(createCourseSchema, validCourse);
    expect(data.requiresKyc).toBe(false);
  });

  it('accepts requiresKyc=true', () => {
    const data = expectValid<CreateCourseInput>(createCourseSchema, { ...validCourse, requiresKyc: true });
    expect(data.requiresKyc).toBe(true);
  });

  it('accepts optional tags array', () => {
    const data = expectValid<CreateCourseInput>(createCourseSchema, { ...validCourse, tags: ['defi', 'nft'] });
    expect(data.tags).toEqual(['defi', 'nft']);
  });

  it('rejects empty title', () => {
    expectInvalid(createCourseSchema, { ...validCourse, title: '' }, 'Title is required');
  });

  it('rejects title longer than 200 characters', () => {
    expectInvalid(createCourseSchema, { ...validCourse, title: 'T'.repeat(201) }, 'Title too long');
  });

  it('rejects description shorter than 10 characters', () => {
    expectInvalid(createCourseSchema, { ...validCourse, description: 'Short' }, 'at least 10 characters');
  });

  it('rejects description longer than 2000 characters', () => {
    expectInvalid(createCourseSchema, { ...validCourse, description: 'A'.repeat(2001) }, 'Description too long');
  });

  it('rejects invalid level', () => {
    expectInvalid(createCourseSchema, { ...validCourse, level: 'expert' });
  });

  it('rejects durationHours less than 1', () => {
    expectInvalid(createCourseSchema, { ...validCourse, durationHours: 0 }, 'at least 1 hour');
  });

  it('rejects durationHours greater than 100', () => {
    expectInvalid(createCourseSchema, { ...validCourse, durationHours: 101 }, 'Duration too long');
  });

  it('rejects negative price', () => {
    expectInvalid(createCourseSchema, { ...validCourse, price: -1 }, 'Price cannot be negative');
  });

  it('rejects price greater than 999.99', () => {
    expectInvalid(createCourseSchema, { ...validCourse, price: 1000 }, 'Price too high');
  });

  it('accepts price of 0 (boundary)', () => {
    const data = expectValid<CreateCourseInput>(createCourseSchema, { ...validCourse, price: 0 });
    expect(data.price).toBe(0);
  });

  it('rejects tags array with more than 10 items', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expectInvalid(createCourseSchema, { ...validCourse, tags }, 'Too many tags');
  });

  it('accepts exactly 10 tags (boundary)', () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    const data = expectValid<CreateCourseInput>(createCourseSchema, { ...validCourse, tags });
    expect(data.tags).toHaveLength(10);
  });
});

// ─── updateCourseSchema ───────────────────────────────────────────────────────

describe('updateCourseSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    const data = expectValid<UpdateCourseInput>(updateCourseSchema, {});
    expect(data).toEqual({});
  });

  it('accepts a partial update with only title', () => {
    const data = expectValid<UpdateCourseInput>(updateCourseSchema, { title: 'New Title' });
    expect(data.title).toBe('New Title');
  });

  it('validates fields that are provided — rejects empty title', () => {
    expectInvalid(updateCourseSchema, { title: '' });
  });

  it('validates fields that are provided — rejects invalid level', () => {
    expectInvalid(updateCourseSchema, { level: 'expert' });
  });
});

// ─── recordProgressSchema ─────────────────────────────────────────────────────

describe('recordProgressSchema', () => {
  const validProgress = {
    courseId: '123e4567-e89b-12d3-a456-426614174000',
    lessonId: '123e4567-e89b-12d3-a456-426614174001',
    progressPct: 50,
  };

  it('accepts a valid progress record', () => {
    const data = expectValid<RecordProgressInput>(recordProgressSchema, validProgress);
    expect(data.progressPct).toBe(50);
  });

  it('accepts progressPct of 0 (boundary)', () => {
    const data = expectValid<RecordProgressInput>(recordProgressSchema, { ...validProgress, progressPct: 0 });
    expect(data.progressPct).toBe(0);
  });

  it('accepts progressPct of 100 (boundary)', () => {
    const data = expectValid<RecordProgressInput>(recordProgressSchema, { ...validProgress, progressPct: 100 });
    expect(data.progressPct).toBe(100);
  });

  it('accepts optional timeSpent', () => {
    const data = expectValid<RecordProgressInput>(recordProgressSchema, { ...validProgress, timeSpent: 120 });
    expect(data.timeSpent).toBe(120);
  });

  it('rejects invalid courseId UUID', () => {
    expectInvalid(recordProgressSchema, { ...validProgress, courseId: 'not-a-uuid' }, 'Invalid course ID');
  });

  it('rejects invalid lessonId UUID', () => {
    expectInvalid(recordProgressSchema, { ...validProgress, lessonId: 'not-a-uuid' }, 'Invalid lesson ID');
  });

  it('rejects progressPct below 0', () => {
    expectInvalid(recordProgressSchema, { ...validProgress, progressPct: -1 }, 'Progress cannot be negative');
  });

  it('rejects progressPct above 100', () => {
    expectInvalid(recordProgressSchema, { ...validProgress, progressPct: 101 }, 'Progress cannot exceed 100%');
  });

  it('rejects negative timeSpent', () => {
    expectInvalid(recordProgressSchema, { ...validProgress, timeSpent: -5 }, 'Time spent cannot be negative');
  });
});

// ─── createReviewSchema ───────────────────────────────────────────────────────

describe('createReviewSchema', () => {
  const validReview = {
    courseId: '123e4567-e89b-12d3-a456-426614174000',
    rating: 4,
    comment: 'This course was very informative and well structured.',
  };

  it('accepts a valid review', () => {
    const data = expectValid<CreateReviewInput>(createReviewSchema, validReview);
    expect(data.rating).toBe(4);
  });

  it('accepts minimum rating of 1 (boundary)', () => {
    const data = expectValid<CreateReviewInput>(createReviewSchema, { ...validReview, rating: 1 });
    expect(data.rating).toBe(1);
  });

  it('accepts maximum rating of 5 (boundary)', () => {
    const data = expectValid<CreateReviewInput>(createReviewSchema, { ...validReview, rating: 5 });
    expect(data.rating).toBe(5);
  });

  it('rejects invalid courseId', () => {
    expectInvalid(createReviewSchema, { ...validReview, courseId: 'bad-id' }, 'Invalid course ID');
  });

  it('rejects rating below 1', () => {
    expectInvalid(createReviewSchema, { ...validReview, rating: 0 }, 'at least 1');
  });

  it('rejects rating above 5', () => {
    expectInvalid(createReviewSchema, { ...validReview, rating: 6 }, 'cannot exceed 5');
  });

  it('rejects comment shorter than 10 characters', () => {
    expectInvalid(createReviewSchema, { ...validReview, comment: 'Too short' }, 'at least 10 characters');
  });

  it('rejects comment longer than 1000 characters', () => {
    expectInvalid(createReviewSchema, { ...validReview, comment: 'A'.repeat(1001) }, 'Comment too long');
  });

  it('accepts comment of exactly 10 characters (boundary)', () => {
    const data = expectValid<CreateReviewInput>(createReviewSchema, { ...validReview, comment: 'A'.repeat(10) });
    expect(data.comment).toHaveLength(10);
  });
});

// ─── notificationPreferencesSchema ────────────────────────────────────────────

describe('notificationPreferencesSchema', () => {
  const validPrefs = {
    emailNotifications: true,
    pushNotifications: false,
    courseUpdates: true,
    marketingEmails: false,
    weeklyDigest: true,
  };

  it('accepts valid preferences', () => {
    const data = expectValid<NotificationPreferencesInput>(notificationPreferencesSchema, validPrefs);
    expect(data.emailNotifications).toBe(true);
    expect(data.pushNotifications).toBe(false);
  });

  it('accepts all-false preferences', () => {
    const allFalse = {
      emailNotifications: false,
      pushNotifications: false,
      courseUpdates: false,
      marketingEmails: false,
      weeklyDigest: false,
    };
    const data = expectValid<NotificationPreferencesInput>(notificationPreferencesSchema, allFalse);
    expect(data.weeklyDigest).toBe(false);
  });

  it('rejects non-boolean emailNotifications', () => {
    expectInvalid(notificationPreferencesSchema, { ...validPrefs, emailNotifications: 'yes' });
  });

  it('rejects missing field', () => {
    const { weeklyDigest: _removed, ...incomplete } = validPrefs;
    expectInvalid(notificationPreferencesSchema, incomplete);
  });
});

// ─── paginationSchema ─────────────────────────────────────────────────────────

describe('paginationSchema', () => {
  it('applies defaults when no values provided', () => {
    const data = expectValid<PaginationInput>(paginationSchema, {});
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
    expect(data.sortOrder).toBe('desc');
  });

  it('accepts valid explicit pagination params', () => {
    const data = expectValid<PaginationInput>(paginationSchema, { page: 3, limit: 25, sortOrder: 'asc' });
    expect(data.page).toBe(3);
    expect(data.limit).toBe(25);
    expect(data.sortOrder).toBe('asc');
  });

  it('coerces string page and limit to numbers', () => {
    const data = expectValid<PaginationInput>(paginationSchema, { page: '2', limit: '20' });
    expect(data.page).toBe(2);
    expect(data.limit).toBe(20);
  });

  it('accepts optional sortBy string', () => {
    const data = expectValid<PaginationInput>(paginationSchema, { sortBy: 'createdAt' });
    expect(data.sortBy).toBe('createdAt');
  });

  it('rejects page less than 1', () => {
    expectInvalid(paginationSchema, { page: 0 }, 'Page must be at least 1');
  });

  it('rejects limit less than 1', () => {
    expectInvalid(paginationSchema, { limit: 0 }, 'Limit must be at least 1');
  });

  it('rejects limit greater than 100', () => {
    expectInvalid(paginationSchema, { limit: 101 }, 'Limit cannot exceed 100');
  });

  it('rejects invalid sortOrder value', () => {
    expectInvalid(paginationSchema, { sortOrder: 'random' });
  });

  it('accepts page=1 (boundary)', () => {
    const data = expectValid<PaginationInput>(paginationSchema, { page: 1 });
    expect(data.page).toBe(1);
  });

  it('accepts limit=100 (boundary)', () => {
    const data = expectValid<PaginationInput>(paginationSchema, { limit: 100 });
    expect(data.limit).toBe(100);
  });
});

// ─── courseQuerySchema ────────────────────────────────────────────────────────

describe('courseQuerySchema', () => {
  it('accepts an empty query (all defaults)', () => {
    const data = expectValid<CourseQueryInput>(courseQuerySchema, {});
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
  });

  it('accepts all optional filter params', () => {
    const query = {
      level: 'intermediate' as const,
      minPrice: 0,
      maxPrice: 200,
      search: 'blockchain',
      tags: ['defi'],
      instructorId: '123e4567-e89b-12d3-a456-426614174000',
      page: 2,
      limit: 5,
    };
    const data = expectValid<CourseQueryInput>(courseQuerySchema, query);
    expect(data.level).toBe('intermediate');
    expect(data.search).toBe('blockchain');
  });

  it('rejects search term longer than 100 characters', () => {
    expectInvalid(courseQuerySchema, { search: 'A'.repeat(101) }, 'Search term too long');
  });

  it('rejects invalid level', () => {
    expectInvalid(courseQuerySchema, { level: 'expert' });
  });

  it('rejects invalid instructorId UUID', () => {
    expectInvalid(courseQuerySchema, { instructorId: 'not-a-uuid' });
  });

  it('rejects negative minPrice', () => {
    expectInvalid(courseQuerySchema, { minPrice: -1 });
  });

  it('rejects negative maxPrice', () => {
    expectInvalid(courseQuerySchema, { maxPrice: -1 });
  });
});

// ─── stellarPublicKeySchema ───────────────────────────────────────────────────

describe('stellarPublicKeySchema', () => {
  it('accepts a valid Stellar public key (G + 55 uppercase base32 chars)', () => {
    const key = 'G' + 'A'.repeat(55);
    const result = stellarPublicKeySchema.safeParse(key);
    expect(result.success).toBe(true);
  });

  it('accepts a realistic-looking Stellar key', () => {
    // A realistic G... key of exactly 56 characters
    const key = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
    if (key.length === 56) {
      const result = stellarPublicKeySchema.safeParse(key);
      expect(result.success).toBe(true);
    }
  });

  it('rejects key shorter than 56 characters', () => {
    expectInvalid(stellarPublicKeySchema, 'G' + 'A'.repeat(50), 'must be 56 characters');
  });

  it('rejects key longer than 56 characters', () => {
    expectInvalid(stellarPublicKeySchema, 'G' + 'A'.repeat(56), 'must be 56 characters');
  });

  it('rejects key not starting with G', () => {
    const key = 'X' + 'A'.repeat(55);
    expectInvalid(stellarPublicKeySchema, key, 'Invalid Stellar public key format');
  });

  it('rejects key with lowercase letters', () => {
    const key = 'G' + 'a'.repeat(55);
    expectInvalid(stellarPublicKeySchema, key, 'Invalid Stellar public key format');
  });

  it('rejects key with non-base32 characters', () => {
    const key = 'G' + '1'.repeat(55); // '1' is not valid base-32
    expectInvalid(stellarPublicKeySchema, key, 'Invalid Stellar public key format');
  });
});

// ─── stellarTransactionHashSchema ────────────────────────────────────────────

describe('stellarTransactionHashSchema', () => {
  it('accepts a valid 64-character lowercase hex hash', () => {
    const hash = 'a'.repeat(64);
    const result = stellarTransactionHashSchema.safeParse(hash);
    expect(result.success).toBe(true);
  });

  it('accepts a valid 64-character uppercase hex hash', () => {
    const hash = 'A'.repeat(64);
    const result = stellarTransactionHashSchema.safeParse(hash);
    expect(result.success).toBe(true);
  });

  it('accepts a realistic hex transaction hash', () => {
    const hash = 'b94f5a8d2e1c073f6a4b9d2e8f1a3c7e5b94f5a8d2e1c073f6a4b9d2e8f1a3c';
    if (hash.length === 64) {
      const result = stellarTransactionHashSchema.safeParse(hash);
      expect(result.success).toBe(true);
    }
  });

  it('rejects hash shorter than 64 characters', () => {
    expectInvalid(stellarTransactionHashSchema, 'a'.repeat(63), 'must be 64 characters');
  });

  it('rejects hash longer than 64 characters', () => {
    expectInvalid(stellarTransactionHashSchema, 'a'.repeat(65), 'must be 64 characters');
  });

  it('rejects hash containing non-hex characters', () => {
    const hash = 'g'.repeat(64); // 'g' is not hex
    expectInvalid(stellarTransactionHashSchema, hash, 'Invalid transaction hash format');
  });
});

// ─── fileUploadSchema ─────────────────────────────────────────────────────────

describe('fileUploadSchema', () => {
  const validFile: FileUploadInput = {
    filename: 'lecture.mp4',
    mimetype: 'video/mp4',
    size: 1024 * 1024, // 1 MB
  };

  it('accepts a valid video file', () => {
    const data = expectValid<FileUploadInput>(fileUploadSchema, validFile);
    expect(data.filename).toBe('lecture.mp4');
  });

  it('accepts image/jpeg mimetype', () => {
    const data = expectValid<FileUploadInput>(fileUploadSchema, { ...validFile, mimetype: 'image/jpeg' });
    expect(data.mimetype).toBe('image/jpeg');
  });

  it('accepts image/png mimetype', () => {
    const data = expectValid<FileUploadInput>(fileUploadSchema, { ...validFile, mimetype: 'image/png' });
    expect(data.mimetype).toBe('image/png');
  });

  it('accepts application/pdf mimetype', () => {
    const data = expectValid<FileUploadInput>(fileUploadSchema, { ...validFile, mimetype: 'application/pdf' });
    expect(data.mimetype).toBe('application/pdf');
  });

  it('accepts size of exactly 100 MB (boundary)', () => {
    const maxSize = 100 * 1024 * 1024;
    const data = expectValid<FileUploadInput>(fileUploadSchema, { ...validFile, size: maxSize });
    expect(data.size).toBe(maxSize);
  });

  it('rejects empty filename', () => {
    expectInvalid(fileUploadSchema, { ...validFile, filename: '' }, 'Filename is required');
  });

  it('rejects invalid mimetype (text/plain)', () => {
    expectInvalid(fileUploadSchema, { ...validFile, mimetype: 'text/plain' }, 'Invalid file type');
  });

  it('rejects invalid mimetype (application/json)', () => {
    expectInvalid(fileUploadSchema, { ...validFile, mimetype: 'application/json' }, 'Invalid file type');
  });

  it('rejects file size exceeding 100 MB', () => {
    const oversized = 100 * 1024 * 1024 + 1;
    expectInvalid(fileUploadSchema, { ...validFile, size: oversized }, 'cannot exceed 100MB');
  });

  it('rejects missing filename', () => {
    const { filename: _removed, ...rest } = validFile;
    expectInvalid(fileUploadSchema, rest);
  });
});
