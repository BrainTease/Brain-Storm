import { z } from 'zod';

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  stellarPublicKey: z.string().length(56, 'Invalid Stellar public key').optional(),
});

// Course validation schemas
export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description too long'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  durationHours: z.number().min(1, 'Duration must be at least 1 hour').max(100, 'Duration too long'),
  price: z.number().min(0, 'Price cannot be negative').max(999.99, 'Price too high'),
  requiresKyc: z.boolean().default(false),
  tags: z.array(z.string()).max(10, 'Too many tags').optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

// Progress validation schemas
export const recordProgressSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  lessonId: z.string().uuid('Invalid lesson ID'),
  progressPct: z.number().min(0, 'Progress cannot be negative').max(100, 'Progress cannot exceed 100%'),
  timeSpent: z.number().min(0, 'Time spent cannot be negative').optional(),
});

// Review validation schemas
export const createReviewSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000, 'Comment too long'),
});

// Notification validation schemas
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  courseUpdates: z.boolean(),
  marketingEmails: z.boolean(),
  weeklyDigest: z.boolean(),
});

// Query validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const courseQuerySchema = paginationSchema.extend({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  tags: z.array(z.string()).optional(),
  instructorId: z.string().uuid().optional(),
});

// Stellar validation schemas
export const stellarPublicKeySchema = z.string()
  .length(56, 'Stellar public key must be 56 characters')
  .regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar public key format');

export const stellarTransactionHashSchema = z.string()
  .length(64, 'Transaction hash must be 64 characters')
  .regex(/^[a-f0-9]{64}$/i, 'Invalid transaction hash format');

// File upload validation schemas
export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.string().regex(/^(image|video|application\/pdf)\//, 'Invalid file type'),
  size: z.number().max(100 * 1024 * 1024, 'File size cannot exceed 100MB'),
});

// Export type inference helpers
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type RecordProgressInput = z.infer<typeof recordProgressSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CourseQueryInput = z.infer<typeof courseQuerySchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
