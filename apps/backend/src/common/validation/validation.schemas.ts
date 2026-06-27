import { IsString, IsEmail, IsOptional, MinLength, MaxLength, Matches, IsInt, Min, Max, IsBoolean, IsIn, IsUUID, IsISO8601, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Common validation schemas for reuse across DTOs
 */

export class EmailSchema {
  @IsEmail()
  email: string;
}

export class PasswordSchema {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;
}

export class UUIDSchema {
  @IsUUID()
  id: string;
}

export class PaginationSchema {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

export class DateRangeSchema {
  @IsISO8601()
  startDate: string;

  @IsISO8601()
  endDate: string;
}

export class CourseSchema {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  durationHours?: number;

  @IsOptional()
  @IsBoolean()
  requiresKyc?: boolean;
}

export class UserSchema {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;
}

export class RoleSchema {
  @IsIn(['admin', 'instructor', 'student', 'moderator'])
  role: string;
}

export class SearchSchema {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  query: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filters?: string[];
}

export class RatingSchema {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class EnrollmentSchema {
  @IsUUID()
  courseId: string;

  @IsOptional()
  @IsBoolean()
  autoEnroll?: boolean;
}

export class ProgressSchema {
  @IsUUID()
  courseId: string;

  @IsInt()
  @Min(0)
  @Max(100)
  percentage: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class NotificationPreferenceSchema {
  @IsBoolean()
  emailNotifications: boolean;

  @IsBoolean()
  pushNotifications: boolean;

  @IsBoolean()
  smsNotifications: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredChannels?: string[];
}

export class WebhookSchema {
  @IsString()
  @Matches(/^https?:\/\/.+/, { message: 'Must be a valid URL' })
  url: string;

  @IsArray()
  @IsString({ each: true })
  events: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

export class BatchOperationSchema {
  @IsArray()
  @IsUUID('all', { each: true })
  ids: string[];

  @IsString()
  @MaxLength(50)
  action: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AuditLogSchema {
  @IsString()
  @MaxLength(100)
  action: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export class StellarTransactionSchema {
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/, { message: 'Invalid Stellar public key' })
  publicKey: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}

export class KycSchema {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  dateOfBirth: string;

  @IsString()
  @MaxLength(50)
  documentType: string;

  @IsString()
  @MaxLength(100)
  documentNumber: string;
}

export class CouponSchema {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[A-Z0-9-]+$/, { message: 'Coupon code must be uppercase alphanumeric with hyphens' })
  code: string;

  @IsInt()
  @Min(0)
  @Max(100)
  discountPercentage: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsISO8601()
  expiryDate: string;
}
