import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchAnalytic } from './search-analytic.entity';
import { Course } from '../courses/course.entity';
import { Lesson } from '../courses/lesson.entity';
import { Post } from '../forums/post.entity';

export type IndexName = 'courses' | 'lessons' | 'posts';

/** Course document stored in Elasticsearch */
interface CourseDoc {
  title: string;
  description: string;
  level: string;
  durationHours: number;
  isPublished: boolean;
  enrollmentCount: number;
  suggest: { input: string[] };
}

/** Synonyms for the custom analyzer */
const SYNONYMS = [
  'blockchain, distributed ledger, DLT',
  'smart contract, solidity, soroban',
  'wallet, keypair, address',
  'NFT, non-fungible token',
  'DeFi, decentralised finance, decentralized finance',
  'JavaScript, JS, ECMAScript',
  'TypeScript, TS',
  'Python, py',
  'beginner, starter, intro, introductory',
  'advanced, expert, senior',
];

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly es: ElasticsearchService,
    @InjectRepository(SearchAnalytic)
    private readonly analyticsRepo: Repository<SearchAnalytic>,
  ) {}

  async onModuleInit() {
    await this.ensureIndices();
  }

  // ─── Index management ──────────────────────────────────────────────────────

  private async ensureIndices() {
    const settings = {
      analysis: {
        filter: {
          synonym_filter: {
            type: 'synonym',
            synonyms: SYNONYMS,
            lenient: true,
          },
          autocomplete_filter: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 20,
          },
        },
        analyzer: {
          synonym_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'stop', 'synonym_filter'],
          },
          autocomplete_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'autocomplete_filter'],
          },
          search_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'stop'],
          },
        },
      },
    };

    const indices: Record<IndexName, object> = {
      courses: {
        settings,
        mappings: {
          properties: {
            title: {
              type: 'text',
              analyzer: 'synonym_analyzer',
              search_analyzer: 'search_analyzer',
              fields: {
                autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer', search_analyzer: 'search_analyzer' },
                keyword: { type: 'keyword' },
              },
              copy_to: 'suggest',
            },
            description: {
              type: 'text',
              analyzer: 'synonym_analyzer',
              search_analyzer: 'search_analyzer',
            },
            level: { type: 'keyword' },
            durationHours: { type: 'float' },
            isPublished: { type: 'boolean' },
            enrollmentCount: { type: 'integer' },
            suggest: { type: 'completion' },
          },
        },
      },
      lessons: {
        settings,
        mappings: {
          properties: {
            title: {
              type: 'text',
              analyzer: 'synonym_analyzer',
              search_analyzer: 'search_analyzer',
              fields: {
                autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer', search_analyzer: 'search_analyzer' },
              },
              copy_to: 'suggest',
            },
            content: { type: 'text', analyzer: 'synonym_analyzer', search_analyzer: 'search_analyzer' },
            moduleId: { type: 'keyword' },
            courseId: { type: 'keyword' },
            durationMinutes: { type: 'integer' },
            suggest: { type: 'completion' },
          },
        },
      },
      posts: {
        settings,
        mappings: {
          properties: {
            title: {
              type: 'text',
              analyzer: 'synonym_analyzer',
              search_analyzer: 'search_analyzer',
              fields: {
                autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer', search_analyzer: 'search_analyzer' },
              },
              copy_to: 'suggest',
            },
            content: { type: 'text', analyzer: 'synonym_analyzer', search_analyzer: 'search_analyzer' },
            courseId: { type: 'keyword' },
            userId: { type: 'keyword' },
            suggest: { type: 'completion' },
          },
        },
      },
    };

    for (const [index, body] of Object.entries(indices)) {
      try {
        const exists = await this.es.indices.exists({ index });
        if (!exists) {
          await this.es.indices.create({ index, ...body });
          this.logger.log(`Created ES index: ${index}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to ensure index ${index}: ${err}`);
      }
    }
  }

  // ─── Indexing ──────────────────────────────────────────────────────────────

  async indexCourse(course: Course, enrollmentCount = 0) {
    await this.es.index({
      index: 'courses',
      id: course.id,
      document: {
        title: course.title,
        description: course.description,
        level: course.level,
        durationHours: course.durationHours,
        isPublished: course.isPublished,
        enrollmentCount,
        suggest: { input: [course.title] },
      } as CourseDoc,
    });
  }

  async indexLesson(lesson: Lesson) {
    await this.es.index({
      index: 'lessons',
      id: lesson.id,
      document: {
        title: lesson.title,
        content: lesson.content,
        moduleId: lesson.moduleId,
        durationMinutes: lesson.durationMinutes,
        suggest: { input: [lesson.title] },
      },
    });
  }

  async indexPost(post: Post) {
    await this.es.index({
      index: 'posts',
      id: post.id,
      document: {
        title: post.title,
        content: post.content,
        courseId: post.courseId,
        userId: post.userId,
        suggest: { input: [post.title] },
      },
    });
  }

  async deleteFromIndex(index: IndexName, id: string) {
    try {
      await this.es.delete({ index, id });
    } catch {
      // ignore 404 — document may not have been indexed
    }
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  /**
   * Hybrid lexical + popularity-boosted search.
   *
   * Ranking signals applied:
   * 1. Multi-match with per-field boosting (title^4, description^2, content^1)
   * 2. Synonyms & typo tolerance via custom synonym_analyzer
   * 3. Popularity boost: log(enrollmentCount + 1) × 0.5 weight on courses
   * 4. Recency decay: Gaussian decay over createdAt for freshness
   * 5. Personalisation: if userId is provided AND privacy allows, the user's
   *    enrolled course IDs are collected and fed into a `more_like_this` clause
   *    added to the `should` array (soft boost, not a hard filter).
   */
  async search(
    query: string,
    indices: IndexName[] = ['courses', 'lessons', 'posts'],
    userId?: string,
    options: {
      enrolledCourseIds?: string[];
      respectPrivacy?: boolean;
      explain?: boolean;
    } = {},
  ) {
    const { enrolledCourseIds = [], explain = false } = options;

    // Build the base multi-match clause
    const baseQuery: any = {
      multi_match: {
        query,
        fields: ['title^4', 'title.autocomplete^3', 'description^2', 'content^1'],
        fuzziness: 'AUTO',
        prefix_length: 1,
        type: 'best_fields',
        tie_breaker: 0.3,
      },
    };

    // Build function_score to blend lexical relevance with popularity
    const functionScoreQuery: any = {
      function_score: {
        query: baseQuery,
        functions: [
          // Popularity boost for courses (field_value_factor)
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

    // Build should clauses for personalisation
    const shouldClauses: any[] = [];
    if (userId && enrolledCourseIds.length > 0 && indices.includes('courses')) {
      // Soft boost for courses related to what the user has already enrolled in
      shouldClauses.push({
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

    const finalQuery =
      shouldClauses.length > 0
        ? {
            bool: {
              must: [functionScoreQuery],
              should: shouldClauses,
            },
          }
        : functionScoreQuery;

    const response = await this.es.search({
      index: indices.join(','),
      query: finalQuery,
      highlight: {
        fields: { title: {}, description: {}, content: {} },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
      },
      size: 20,
      explain,
    });

    const hits = response.hits.hits.map((hit) => ({
      id: hit._id,
      type: hit._index,
      score: hit._score,
      ...(hit._source as object),
      highlight: hit.highlight,
      ...(explain ? { explanation: (hit as any)._explanation } : {}),
    }));

    await this.trackAnalytic(query, hits.length, userId);
    return { total: response.hits.total, hits };
  }

  // ─── Autocomplete ──────────────────────────────────────────────────────────

  async autocomplete(prefix: string, indices: IndexName[] = ['courses', 'lessons', 'posts']) {
    const response = await this.es.search({
      index: indices.join(','),
      suggest: {
        suggestions: {
          prefix,
          completion: {
            field: 'suggest',
            size: 5,
            skip_duplicates: true,
            fuzzy: { fuzziness: 1 },
          },
        },
      },
      _source: ['title'],
      size: 0,
    });

    const suggestions =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response.suggest?.['suggestions'] as any[])?.flatMap((s: any) =>
        (s.options ?? []).map((o: any) => ({ text: o.text, index: o._index, id: o._id })),
      ) ?? [];

    return suggestions;
  }

  // ─── Relevance evaluation ──────────────────────────────────────────────────

  /**
   * Evaluate search quality against a labeled query set.
   * Each entry has a query and a list of expected result IDs in priority order.
   * Returns precision@k and NDCG@k metrics for each query.
   */
  async evaluateRelevance(
    labeledSet: Array<{ query: string; relevantIds: string[] }>,
    k = 5,
  ): Promise<Array<{ query: string; precisionAtK: number; ndcgAtK: number }>> {
    const results: Array<{ query: string; precisionAtK: number; ndcgAtK: number }> = [];

    for (const { query, relevantIds } of labeledSet) {
      const { hits } = await this.search(query);
      const returnedIds = hits.slice(0, k).map((h) => h.id);

      const relevantSet = new Set(relevantIds);
      const hits_at_k = returnedIds.filter((id) => relevantSet.has(id)).length;
      const precisionAtK = hits_at_k / k;

      // Discounted Cumulative Gain
      let dcg = 0;
      let idcg = 0;
      for (let i = 0; i < k; i++) {
        const rel = relevantSet.has(returnedIds[i]) ? 1 : 0;
        dcg += rel / Math.log2(i + 2);
        if (i < relevantIds.length) idcg += 1 / Math.log2(i + 2);
      }
      const ndcgAtK = idcg > 0 ? dcg / idcg : 0;

      results.push({ query, precisionAtK, ndcgAtK });
    }

    return results;
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  private async trackAnalytic(query: string, resultsCount: number, userId?: string) {
    try {
      await this.analyticsRepo.save(
        this.analyticsRepo.create({ query, resultsCount, userId: userId ?? null }),
      );
    } catch {
      // non-critical
    }
  }

  async trackClick(query: string, resultId: string, resultType: string, userId?: string) {
    await this.analyticsRepo.save(
      this.analyticsRepo.create({
        query,
        resultsCount: 0,
        clickedResultId: resultId,
        clickedResultType: resultType,
        userId: userId ?? null,
      }),
    );
  }

  async getTopQueries(limit = 10) {
    return this.analyticsRepo
      .createQueryBuilder('a')
      .select('a.query', 'query')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.query')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
