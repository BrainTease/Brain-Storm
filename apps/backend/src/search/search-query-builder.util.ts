import { IndexName } from './search.service';

export interface SearchFilters {
  level?: string | string[];
  minDurationHours?: number;
  maxDurationHours?: number;
  courseId?: string;
  userId?: string;
}

export interface BuildSearchQueryOptions {
  query: string;
  indices: IndexName[];
  filters?: SearchFilters;
  personalization?: {
    userId?: string;
    enrolledCourseIds?: string[];
  };
}

/**
 * Shared Elasticsearch query-builder for course/lesson/post ("forum") search.
 *
 * Previously the multi-match/function-score/personalisation/filter logic
 * lived inline inside `SearchService.search`, which made it hard to reuse
 * the same filter-combination rules for a course-only, user-only, or
 * forum-only search surface without copy-pasting the query shape. This
 * utility is the single place that turns `(query, indices, filters,
 * personalization)` into an Elasticsearch query body.
 */
export class SearchQueryBuilder {
  /** Build the base lexical multi_match clause shared by every search. */
  static buildBaseQuery(query: string): Record<string, any> {
    return {
      multi_match: {
        query,
        fields: ['title^4', 'title.autocomplete^3', 'description^2', 'content^1'],
        fuzziness: 'AUTO',
        prefix_length: 1,
        type: 'best_fields',
        tie_breaker: 0.3,
      },
    };
  }

  /** Build `term`/`range` filter clauses from a normalized SearchFilters object. */
  static buildFilterClauses(filters?: SearchFilters): Record<string, any>[] {
    if (!filters) return [];

    const clauses: Record<string, any>[] = [];

    if (filters.level) {
      const levels = Array.isArray(filters.level) ? filters.level : [filters.level];
      clauses.push({ terms: { level: levels } });
    }

    if (filters.minDurationHours !== undefined || filters.maxDurationHours !== undefined) {
      const range: Record<string, number> = {};
      if (filters.minDurationHours !== undefined) range.gte = filters.minDurationHours;
      if (filters.maxDurationHours !== undefined) range.lte = filters.maxDurationHours;
      clauses.push({ range: { durationHours: range } });
    }

    if (filters.courseId) {
      clauses.push({ term: { courseId: filters.courseId } });
    }

    if (filters.userId) {
      clauses.push({ term: { userId: filters.userId } });
    }

    return clauses;
  }

  /** Build the popularity function_score wrapper (courses only). */
  static buildFunctionScoreQuery(baseQuery: Record<string, any>): Record<string, any> {
    return {
      function_score: {
        query: baseQuery,
        functions: [
          {
            filter: { term: { _index: 'courses' } },
            field_value_factor: {
              field: 'enrollmentCount',
              factor: 0.5,
              modifier: 'log1p',
              missing: 0,
            },
          },
        ],
        score_mode: 'sum',
        boost_mode: 'sum',
      },
    };
  }

  /** Build the personalisation `should` clauses (soft boost, never a hard filter). */
  static buildPersonalizationClauses(
    indices: IndexName[],
    personalization?: BuildSearchQueryOptions['personalization'],
  ): Record<string, any>[] {
    const clauses: Record<string, any>[] = [];
    const enrolledCourseIds = personalization?.enrolledCourseIds ?? [];

    if (personalization?.userId && enrolledCourseIds.length > 0 && indices.includes('courses')) {
      clauses.push({
        more_like_this: {
          fields: ['title', 'description'],
          like: enrolledCourseIds.slice(0, 10).map((id) => ({
            _index: 'courses',
            _id: id,
          })),
          min_term_freq: 1,
          max_query_terms: 12,
          boost: 0.8,
        },
      });
    }

    return clauses;
  }

  /**
   * Compose the full Elasticsearch query body for a search request,
   * combining lexical relevance, popularity boosting, structured filters,
   * and personalisation into one `bool` query.
   */
  static build(options: BuildSearchQueryOptions): Record<string, any> {
    const baseQuery = this.buildBaseQuery(options.query);
    const functionScoreQuery = this.buildFunctionScoreQuery(baseQuery);
    const filterClauses = this.buildFilterClauses(options.filters);
    const shouldClauses = this.buildPersonalizationClauses(
      options.indices,
      options.personalization,
    );

    if (filterClauses.length === 0 && shouldClauses.length === 0) {
      return functionScoreQuery;
    }

    const bool: Record<string, any> = { must: [functionScoreQuery] };
    if (filterClauses.length > 0) bool.filter = filterClauses;
    if (shouldClauses.length > 0) bool.should = shouldClauses;

    return { bool };
  }
}
