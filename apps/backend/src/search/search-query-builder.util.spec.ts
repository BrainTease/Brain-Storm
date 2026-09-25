import { SearchQueryBuilder } from './search-query-builder.util';

describe('SearchQueryBuilder', () => {
  describe('buildBaseQuery', () => {
    it('builds a multi_match clause across all searchable fields', () => {
      const q = SearchQueryBuilder.buildBaseQuery('blockchain');
      expect(q.multi_match.query).toBe('blockchain');
      expect(q.multi_match.fields).toEqual([
        'title^4',
        'title.autocomplete^3',
        'description^2',
        'content^1',
      ]);
    });
  });

  describe('buildFilterClauses', () => {
    it('returns no clauses when filters are undefined', () => {
      expect(SearchQueryBuilder.buildFilterClauses(undefined)).toEqual([]);
    });

    it('returns no clauses for an empty filters object', () => {
      expect(SearchQueryBuilder.buildFilterClauses({})).toEqual([]);
    });

    it('builds a terms clause for a single level string', () => {
      const clauses = SearchQueryBuilder.buildFilterClauses({ level: 'beginner' });
      expect(clauses).toContainEqual({ terms: { level: ['beginner'] } });
    });

    it('builds a terms clause for an array of levels', () => {
      const clauses = SearchQueryBuilder.buildFilterClauses({
        level: ['beginner', 'intermediate'],
      });
      expect(clauses).toContainEqual({
        terms: { level: ['beginner', 'intermediate'] },
      });
    });

    it('builds a range clause with only a min bound', () => {
      const clauses = SearchQueryBuilder.buildFilterClauses({ minDurationHours: 2 });
      expect(clauses).toContainEqual({ range: { durationHours: { gte: 2 } } });
    });

    it('builds a range clause with only a max bound', () => {
      const clauses = SearchQueryBuilder.buildFilterClauses({ maxDurationHours: 10 });
      expect(clauses).toContainEqual({ range: { durationHours: { lte: 10 } } });
    });

    it('builds a range clause combining min and max bounds', () => {
      const clauses = SearchQueryBuilder.buildFilterClauses({
        minDurationHours: 2,
        maxDurationHours: 10,
      });
      expect(clauses).toContainEqual({
        range: { durationHours: { gte: 2, lte: 10 } },
      });
    });

    it('builds a term clause for courseId (forum/lesson scoping)', () => {
      const clauses = SearchQueryBuilder.buildFilterClauses({ courseId: 'course-1' });
      expect(clauses).toContainEqual({ term: { courseId: 'course-1' } });
    });

    it('builds a term clause for userId', () => {
      const clauses = SearchQueryBuilder.buildFilterClauses({ userId: 'user-1' });
      expect(clauses).toContainEqual({ term: { userId: 'user-1' } });
    });

    it('combines multiple filters into multiple clauses', () => {
      const clauses = SearchQueryBuilder.buildFilterClauses({
        level: 'advanced',
        minDurationHours: 1,
        courseId: 'course-9',
      });
      expect(clauses).toHaveLength(3);
    });
  });

  describe('buildPersonalizationClauses', () => {
    it('returns no clauses without a userId', () => {
      const clauses = SearchQueryBuilder.buildPersonalizationClauses(['courses'], {
        enrolledCourseIds: ['c1'],
      });
      expect(clauses).toEqual([]);
    });

    it('returns no clauses when there are no enrolled courses', () => {
      const clauses = SearchQueryBuilder.buildPersonalizationClauses(['courses'], {
        userId: 'u1',
        enrolledCourseIds: [],
      });
      expect(clauses).toEqual([]);
    });

    it('returns no clauses when courses is not among the searched indices', () => {
      const clauses = SearchQueryBuilder.buildPersonalizationClauses(['posts'], {
        userId: 'u1',
        enrolledCourseIds: ['c1'],
      });
      expect(clauses).toEqual([]);
    });

    it('builds a more_like_this clause when personalisation applies', () => {
      const clauses = SearchQueryBuilder.buildPersonalizationClauses(['courses', 'lessons'], {
        userId: 'u1',
        enrolledCourseIds: ['c1', 'c2'],
      });
      expect(clauses).toHaveLength(1);
      expect(clauses[0].more_like_this.like).toEqual([
        { _index: 'courses', _id: 'c1' },
        { _index: 'courses', _id: 'c2' },
      ]);
    });

    it('caps the more_like_this like list at 10 courses', () => {
      const ids = Array.from({ length: 15 }, (_, i) => `c${i}`);
      const clauses = SearchQueryBuilder.buildPersonalizationClauses(['courses'], {
        userId: 'u1',
        enrolledCourseIds: ids,
      });
      expect(clauses[0].more_like_this.like).toHaveLength(10);
    });
  });

  describe('build', () => {
    it('returns a bare function_score query with no filters or personalisation', () => {
      const q = SearchQueryBuilder.build({ query: 'stellar', indices: ['courses'] });
      expect(q).toHaveProperty('function_score');
      expect(q).not.toHaveProperty('bool');
    });

    it('wraps in a bool query with a filter clause when filters are present', () => {
      const q = SearchQueryBuilder.build({
        query: 'stellar',
        indices: ['courses'],
        filters: { level: 'beginner' },
      });
      expect(q.bool.must[0]).toHaveProperty('function_score');
      expect(q.bool.filter).toContainEqual({ terms: { level: ['beginner'] } });
      expect(q.bool.should).toBeUndefined();
    });

    it('wraps in a bool query with should clauses when personalisation is present', () => {
      const q = SearchQueryBuilder.build({
        query: 'stellar',
        indices: ['courses'],
        personalization: { userId: 'u1', enrolledCourseIds: ['c1'] },
      });
      expect(q.bool.should).toHaveLength(1);
      expect(q.bool.filter).toBeUndefined();
    });

    it('combines filters and personalisation in a single bool query', () => {
      const q = SearchQueryBuilder.build({
        query: 'stellar',
        indices: ['courses'],
        filters: { level: ['beginner', 'advanced'], minDurationHours: 1 },
        personalization: { userId: 'u1', enrolledCourseIds: ['c1'] },
      });
      expect(q.bool.filter).toHaveLength(2);
      expect(q.bool.should).toHaveLength(1);
    });

    it('ignores personalisation for a forum-only (posts) search', () => {
      const q = SearchQueryBuilder.build({
        query: 'stellar',
        indices: ['posts'],
        filters: { courseId: 'course-1' },
        personalization: { userId: 'u1', enrolledCourseIds: ['c1'] },
      });
      expect(q.bool.filter).toContainEqual({ term: { courseId: 'course-1' } });
      expect(q.bool.should).toBeUndefined();
    });
  });
});
