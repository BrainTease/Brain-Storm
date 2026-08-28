/**
 * CourseResponseDto — issue #993
 *
 * The only shape that leaves the API for any course-related response.
 * Internal/operational fields are omitted:
 *
 *   Stripped fields (never sent to clients):
 *   - isDeleted    — soft-delete flag; clients should never see logically deleted courses
 *   - deletedAt    — soft-delete timestamp; internal operational column
 *   - isPublished  — deprecated in favour of `status`; kept only for DB
 *                    backward-compat, must not be leaked to clients
 *   - createdBy    — internal audit column
 *   - updatedBy    — internal audit column
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Course, CourseStatus } from '../course.entity';

export class CourseResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id: string;

  @ApiProperty({ example: 'Introduction to Stellar Blockchain' })
  title: string;

  @ApiProperty({ example: 'Learn the fundamentals of the Stellar network.' })
  description: string;

  @ApiProperty({ example: 'beginner', enum: ['beginner', 'intermediate', 'advanced'] })
  level: string;

  @ApiProperty({ example: 8 })
  durationHours: number;

  @ApiProperty({ enum: CourseStatus, example: CourseStatus.PUBLISHED })
  status: CourseStatus;

  @ApiProperty({ example: false })
  requiresKyc: boolean;

  @ApiPropertyOptional({ example: 'uuid-of-instructor' })
  instructorId: string | null;

  @ApiPropertyOptional({ example: '2026-01-15T10:00:00.000Z' })
  scheduledAt: Date | null;

  @ApiPropertyOptional({ example: '2026-01-10T08:00:00.000Z' })
  publishedAt: Date | null;

  @ApiPropertyOptional({ example: 4.8 })
  averageRating: number | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  constructor(course: Course) {
    this.id = course.id;
    this.title = course.title;
    this.description = course.description;
    this.level = course.level;
    this.durationHours = course.durationHours;
    this.status = course.status;
    this.requiresKyc = course.requiresKyc;
    this.instructorId = course.instructorId ?? null;
    this.scheduledAt = course.scheduledAt ?? null;
    this.publishedAt = course.publishedAt ?? null;
    this.averageRating = course.averageRating ?? null;
    this.createdAt = course.createdAt;
    this.updatedAt = course.updatedAt;
    // Intentionally omitted: isDeleted, deletedAt, isPublished (deprecated),
    // createdBy, updatedBy
  }
}

/** Serialise a single Course entity into a safe response DTO. */
export function toCourseResponseDto(course: Course): CourseResponseDto {
  return new CourseResponseDto(course);
}

/** Serialise an array of Course entities into safe response DTOs. */
export function toCourseResponseDtos(courses: Course[]): CourseResponseDto[] {
  return courses.map(toCourseResponseDto);
}
