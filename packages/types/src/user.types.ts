/**
 * Shared user-related types used by both frontend and backend.
 * @module user.types
 */

/** Roles available in the platform */
export type UserRole = 'student' | 'instructor' | 'admin';

/**
 * Public-facing user profile data.
 * Safe to expose to the frontend — excludes sensitive fields like passwordHash.
 */
export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  firstName?: string;
  lastName?: string;
  avatar: string | null;
  bio: string | null;
  role: UserRole;
  stellarPublicKey: string | null;
  isVerified: boolean;
  isBanned: boolean;
  mfaEnabled: boolean;
  referralCode: string | null;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
  };
  stats: {
    coursesCompleted: number;
    totalTimeSpent: number;
    certificatesEarned: number;
    currentStreak: number;
    longestStreak: number;
  };
  createdAt: string;
  updatedAt?: string;
}

/**
 * DTO for updating a user's profile.
 * All fields are optional — only provided fields are updated.
 */
export interface UpdateUserDto {
  /** 3–30 characters */
  username?: string;
  firstName?: string;
  lastName?: string;
  /** Must be a valid URL */
  avatar?: string;
  /** Max 500 characters, HTML stripped */
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

export interface UserPreferencesDto {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
}

/**
 * DTO for user registration.
 */
export interface RegisterDto {
  email: string;
  /** Min 8 characters */
  password: string;
  firstName: string;
  lastName: string;
  stellarPublicKey?: string;
  /** Optional referral code from an existing user */
  referralCode?: string;
}

/**
 * DTO for user login.
 */
export interface LoginDto {
  email: string;
  password: string;
  /** TOTP code or backup code — required if MFA is enabled */
  mfaToken?: string;
  rememberMe?: boolean;
}

/**
 * Response returned after a successful login or token refresh.
 */
export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
  expiresIn: number;
}

/**
 * Response when MFA is required to complete login.
 */
export interface MfaRequiredResponse {
  mfa_required: true;
}

/** Union of possible login responses */
export type LoginResponse = AuthTokensResponse | MfaRequiredResponse;

/**
 * JWT payload decoded from an access token.
 */
export interface JwtPayload {
  /** User ID */
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByRole: {
    students: number;
    instructors: number;
    admins: number;
  };
  usersByStatus: {
    verified: number;
    unverified: number;
    banned: number;
  };
}

export interface InstructorProfile extends UserProfile {
  role: 'instructor';
  expertise: string[];
  experience: string;
  education: string;
  certifications: string[];
  rating: number;
  totalStudents: number;
  totalCourses: number;
  earnings: {
    total: number;
    thisMonth: number;
    lastMonth: number;
  };
  isApproved: boolean;
  approvedAt?: string;
}

export interface StudentProfile extends UserProfile {
  role: 'student';
  enrolledCourses: string[];
  completedCourses: string[];
  currentLearningPath?: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  goals: string[];
}
