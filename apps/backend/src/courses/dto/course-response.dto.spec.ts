/**
 * Unit tests for CourseResponseDto — issue #993
 *
 * Asserts that internal operational fields are stripped before a course
 * response reaches the client.
 */
import { CourseResponseDto, toCourseResponseDto, toCourseResponseDtos } from './course-response.dto';
import { Course, CourseStatus } from '../course.entity';

/** Build a fully-populated Course entity including all internal fields. */
function buildCourse(overrides: Partial<Course> = {}): Course {
  const course = new Course();
  course.id = 'course-uuid-1';
  course.title = 'Introduction to Stellar';
  course.description = 'Learn the fundamentals of the Stellar network.';
  course.level = 'beginner';
  course.durationHours = 8;
  course.status = CourseStatus.PUBLISHED;
  course.requiresKyc = false;
  course.instructorId = 'instructor-uuid';
  course.scheduledAt = null;
  course.publishedAt = new Date('2024-06-01T00:00:00Z');
  course.averageRating = 4.8;
  course.createdAt = new Date('2024-01-01T00:00:00Z');
  course.updatedAt = new Date('2024-01-02T00:00:00Z');

  // Internal-only fields — must never leave the API
  course.isDeleted = false;
  course.deletedAt = null;
  course.isPublished = true;   // deprecated internal flag
  course.createdBy = 'admin-uuid';
  course.updatedBy = 'admin-uuid';

  return Object.assign(course, overrides);
}

describe('CourseResponseDto', () => {
  // ── Field-stripping (primary acceptance criteria for #993) ─────────────────

  it('strips isDeleted from the response', () => {
    const dto = toCourseResponseDto(buildCourse());
    expect((dto as any).isDeleted).toBeUndefined();
  });

  it('strips deletedAt from the response', () => {
    const dto = toCourseResponseDto(buildCourse());
    expect((dto as any).deletedAt).toBeUndefined();
  });

  it('strips the deprecated isPublished flag from the response', () => {
    const dto = toCourseResponseDto(buildCourse());
    expect((dto as any).isPublished).toBeUndefined();
  });

  it('strips createdBy from the response', () => {
    const dto = toCourseResponseDto(buildCourse());
    expect((dto as any).createdBy).toBeUndefined();
  });

  it('strips updatedBy from the response', () => {
    const dto = toCourseResponseDto(buildCourse());
    expect((dto as any).updatedBy).toBeUndefined();
  });

  it('strips all internal fields in one assertion (no extra own keys)', () => {
    const dto = toCourseResponseDto(buildCourse());
    const keys = Object.keys(dto);
    const forbidden = ['isDeleted', 'deletedAt', 'isPublished', 'createdBy', 'updatedBy'];
    for (const field of forbidden) {
      expect(keys).not.toContain(field);
    }
  });

  // ── Public field mapping ───────────────────────────────────────────────────

  it('maps all public fields correctly', () => {
    const course = buildCourse();
    const dto = toCourseResponseDto(course);

    expect(dto.id).toBe(course.id);
    expect(dto.title).toBe(course.title);
    expect(dto.description).toBe(course.description);
    expect(dto.level).toBe(course.level);
    expect(dto.durationHours).toBe(course.durationHours);
    expect(dto.status).toBe(course.status);
    expect(dto.requiresKyc).toBe(course.requiresKyc);
    expect(dto.instructorId).toBe(course.instructorId);
    expect(dto.scheduledAt).toBeNull();
    expect(dto.publishedAt).toBe(course.publishedAt);
    expect(dto.averageRating).toBe(course.averageRating);
    expect(dto.createdAt).toBe(course.createdAt);
    expect(dto.updatedAt).toBe(course.updatedAt);
  });

  it('is an instance of CourseResponseDto', () => {
    const dto = toCourseResponseDto(buildCourse());
    expect(dto).toBeInstanceOf(CourseResponseDto);
  });

  // ── Null / optional fields ─────────────────────────────────────────────────

  it('normalises undefined optional fields to null', () => {
    const course = buildCourse({
      instructorId: undefined as any,
      scheduledAt: undefined as any,
      publishedAt: undefined as any,
      averageRating: undefined as any,
    });
    const dto = toCourseResponseDto(course);

    expect(dto.instructorId).toBeNull();
    expect(dto.scheduledAt).toBeNull();
    expect(dto.publishedAt).toBeNull();
    expect(dto.averageRating).toBeNull();
  });

  it('preserves scheduledAt when present', () => {
    const scheduledAt = new Date('2026-01-15T10:00:00Z');
    const dto = toCourseResponseDto(buildCourse({ scheduledAt }));
    expect(dto.scheduledAt).toBe(scheduledAt);
  });

  // ── Soft-deleted course ────────────────────────────────────────────────────

  it('does not leak isDeleted=true to the client', () => {
    const dto = toCourseResponseDto(
      buildCourse({ isDeleted: true, deletedAt: new Date('2024-05-01T00:00:00Z') })
    );
    expect((dto as any).isDeleted).toBeUndefined();
    expect((dto as any).deletedAt).toBeUndefined();
  });

  // ── toCourseResponseDtos (array helper) ───────────────────────────────────

  it('toCourseResponseDtos strips internal fields from every element', () => {
    const courses = [
      buildCourse({ id: '1', isDeleted: false }),
      buildCourse({ id: '2', isDeleted: true }),
      buildCourse({ id: '3', createdBy: 'admin' }),
    ];
    const dtos = toCourseResponseDtos(courses);

    expect(dtos).toHaveLength(3);
    for (const dto of dtos) {
      expect((dto as any).isDeleted).toBeUndefined();
      expect((dto as any).deletedAt).toBeUndefined();
      expect((dto as any).isPublished).toBeUndefined();
      expect((dto as any).createdBy).toBeUndefined();
    }
  });

  it('toCourseResponseDtos returns an empty array for empty input', () => {
    expect(toCourseResponseDtos([])).toEqual([]);
  });

  // ── JSON serialisation ─────────────────────────────────────────────────────

  it('internal fields are absent in JSON.stringify output', () => {
    const dto = toCourseResponseDto(buildCourse({ isDeleted: true, createdBy: 'admin' }));
    const json = JSON.stringify(dto);
    const parsed = JSON.parse(json);

    expect(parsed.isDeleted).toBeUndefined();
    expect(parsed.deletedAt).toBeUndefined();
    expect(parsed.isPublished).toBeUndefined();
    expect(parsed.createdBy).toBeUndefined();
    // Public fields still present
    expect(parsed.title).toBe('Introduction to Stellar');
    expect(parsed.status).toBe(CourseStatus.PUBLISHED);
  });

  // ── CourseStatus enum ──────────────────────────────────────────────────────

  it('exposes the status enum value correctly for each status', () => {
    for (const status of Object.values(CourseStatus)) {
      const dto = toCourseResponseDto(buildCourse({ status }));
      expect(dto.status).toBe(status);
    }
  });
});
