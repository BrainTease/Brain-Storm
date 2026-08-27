import { describe, it, expect } from 'vitest';
import {
  applyProgressUpdate,
  computeStats,
  courseIdsFromProgress,
  filterAndSortCourses,
  filterCourses,
  isCourseComplete,
  joinCourses,
  sortCourses,
  sortCredentialsByIssuedAt,
  toCredentialRecords,
  toProgressRecords,
  type CourseData,
  type EnrolledCourse,
} from '@/lib/dashboard';

const courses: Record<string, CourseData> = {
  'c-1': { id: 'c-1', title: 'Stellar Basics', level: 'beginner', durationHours: 3 },
  'c-2': { id: 'c-2', title: 'Advanced Soroban', level: 'advanced', durationHours: 8 },
};

const progress = [
  { id: 'p-1', courseId: 'c-1', progressPct: 100 },
  { id: 'p-2', courseId: 'c-2', progressPct: 40 },
  { id: 'p-3', courseId: 'c-missing', progressPct: 0 },
];

describe('toProgressRecords', () => {
  it('defaults a missing progressPct to zero', () => {
    expect(toProgressRecords([{ id: 'p-1', courseId: 'c-1' }])).toEqual([
      { id: 'p-1', courseId: 'c-1', progressPct: 0 },
    ]);
  });

  it('returns an empty list for a non-array payload', () => {
    expect(toProgressRecords(undefined)).toEqual([]);
    expect(toProgressRecords(null)).toEqual([]);
  });
});

describe('toCredentialRecords', () => {
  it('falls back from issuedAt to createdAt', () => {
    const [record] = toCredentialRecords([
      { id: 'cr-1', courseId: 'c-1', createdAt: '2026-01-02T00:00:00Z' },
    ]);
    expect(record.issuedAt).toBe('2026-01-02T00:00:00Z');
    expect(record.course).toBeUndefined();
  });

  it('keeps the embedded course when present', () => {
    const [record] = toCredentialRecords([
      { id: 'cr-1', courseId: 'c-1', issuedAt: '', course: { id: 'c-1', title: 'Stellar Basics' } },
    ]);
    expect(record.course).toEqual({ id: 'c-1', title: 'Stellar Basics' });
  });

  it('returns an empty list for a non-array payload', () => {
    expect(toCredentialRecords({})).toEqual([]);
  });
});

describe('sortCredentialsByIssuedAt', () => {
  it('orders newest first without mutating the input', () => {
    const input = [
      { id: 'a', courseId: 'c-1', issuedAt: '2026-01-01T00:00:00Z' },
      { id: 'b', courseId: 'c-2', issuedAt: '2026-03-01T00:00:00Z' },
    ];
    expect(sortCredentialsByIssuedAt(input).map((c) => c.id)).toEqual(['b', 'a']);
    expect(input.map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('courseIdsFromProgress', () => {
  it('de-duplicates course ids', () => {
    expect(
      courseIdsFromProgress([
        { id: 'p-1', courseId: 'c-1', progressPct: 0 },
        { id: 'p-2', courseId: 'c-1', progressPct: 50 },
      ])
    ).toEqual(['c-1']);
  });
});

describe('joinCourses', () => {
  it('attaches course details to each progress record', () => {
    const [first] = joinCourses(progress, courses);
    expect(first.title).toBe('Stellar Basics');
    expect(first.level).toBe('beginner');
    expect(first.durationHours).toBe(3);
  });

  it('falls back to a placeholder title when the course failed to load', () => {
    const joined = joinCourses(progress, courses);
    expect(joined[2].title).toBe('Course c-missing');
    expect(joined[2].level).toBeUndefined();
  });
});

describe('filterCourses', () => {
  const joined = joinCourses(progress, courses);

  it('returns everything for "all"', () => {
    expect(filterCourses(joined, 'all')).toHaveLength(3);
  });

  it('excludes untouched and finished courses for "in-progress"', () => {
    expect(filterCourses(joined, 'in-progress').map((c) => c.id)).toEqual(['p-2']);
  });

  it('keeps only fully complete courses for "completed"', () => {
    expect(filterCourses(joined, 'completed').map((c) => c.id)).toEqual(['p-1']);
  });
});

describe('sortCourses', () => {
  const joined = joinCourses(progress, courses);

  it('sorts by descending progress', () => {
    expect(sortCourses(joined, 'progress').map((c) => c.progressPct)).toEqual([100, 40, 0]);
  });

  it('sorts by title alphabetically', () => {
    expect(sortCourses(joined, 'title').map((c) => c.title)).toEqual([
      'Advanced Soroban',
      'Course c-missing',
      'Stellar Basics',
    ]);
  });

  it('does not mutate the input order', () => {
    const input = joinCourses(progress, courses);
    sortCourses(input, 'title');
    expect(input.map((c) => c.id)).toEqual(['p-1', 'p-2', 'p-3']);
  });
});

describe('filterAndSortCourses', () => {
  it('filters before sorting', () => {
    const joined = joinCourses(progress, courses);
    expect(filterAndSortCourses(joined, 'in-progress', 'title').map((c) => c.id)).toEqual(['p-2']);
  });
});

describe('computeStats', () => {
  it('aggregates completion, hours and badge counts', () => {
    const joined = joinCourses(progress, courses);
    expect(computeStats(joined, [{ id: 'cr-1', courseId: 'c-1', issuedAt: '' }])).toEqual({
      completed: 1,
      inProgress: 1,
      totalHours: 11,
      badges: 1,
    });
  });

  it('treats courses without a duration as zero hours', () => {
    const noDuration: EnrolledCourse[] = [
      { id: 'p-1', courseId: 'c-1', progressPct: 10, title: 'X' },
    ];
    expect(computeStats(noDuration, []).totalHours).toBe(0);
  });
});

describe('isCourseComplete', () => {
  it('is true only at exactly 100', () => {
    expect(isCourseComplete(100)).toBe(true);
    expect(isCourseComplete(99)).toBe(false);
  });
});

describe('applyProgressUpdate', () => {
  it('updates only the matching course', () => {
    const updated = applyProgressUpdate(progress, { courseId: 'c-2', progressPct: 75 });
    expect(updated.map((p) => p.progressPct)).toEqual([100, 75, 0]);
  });

  it('leaves the list unchanged for an unknown course', () => {
    const updated = applyProgressUpdate(progress, { courseId: 'nope', progressPct: 75 });
    expect(updated.map((p) => p.progressPct)).toEqual([100, 40, 0]);
  });
});
