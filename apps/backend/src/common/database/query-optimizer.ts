import { SelectQueryBuilder } from 'typeorm';

/**
 * Query optimization utilities for preventing N+1 problems and improving performance
 */
export class QueryOptimizer {
  /**
   * Add eager loading relations to prevent N+1 queries
   * @param qb - Query builder
   * @param relations - Array of relation paths to eager load
   * @returns Modified query builder
   */
  static eagerLoadRelations<T>(
    qb: SelectQueryBuilder<T>,
    relations: string[],
  ): SelectQueryBuilder<T> {
    let optimizedQb = qb;
    for (const relation of relations) {
      const alias = relation.split('.')[0];
      optimizedQb = optimizedQb.leftJoinAndSelect(
        `${qb.alias}.${relation}`,
        alias,
      );
    }
    return optimizedQb;
  }

  /**
   * Add pagination to query
   * @param qb - Query builder
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Modified query builder
   */
  static paginate<T>(
    qb: SelectQueryBuilder<T>,
    page: number = 1,
    limit: number = 20,
  ): SelectQueryBuilder<T> {
    const offset = (page - 1) * limit;
    return qb.skip(offset).take(limit);
  }

  /**
   * Add sorting to query
   * @param qb - Query builder
   * @param sortBy - Field to sort by
   * @param order - Sort order (ASC or DESC)
   * @returns Modified query builder
   */
  static sort<T>(
    qb: SelectQueryBuilder<T>,
    sortBy: string,
    order: 'ASC' | 'DESC' = 'ASC',
  ): SelectQueryBuilder<T> {
    return qb.orderBy(`${qb.alias}.${sortBy}`, order);
  }

  /**
   * Add filtering to query
   * @param qb - Query builder
   * @param filters - Object with field names and values
   * @returns Modified query builder
   */
  static filter<T>(
    qb: SelectQueryBuilder<T>,
    filters: Record<string, any>,
  ): SelectQueryBuilder<T> {
    let optimizedQb = qb;
    let paramIndex = 0;

    for (const [field, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;

      const paramName = `param_${paramIndex++}`;
      if (Array.isArray(value)) {
        optimizedQb = optimizedQb.andWhere(
          `${qb.alias}.${field} IN (:...${paramName})`,
          { [paramName]: value },
        );
      } else if (typeof value === 'string' && value.includes('%')) {
        optimizedQb = optimizedQb.andWhere(
          `${qb.alias}.${field} ILIKE :${paramName}`,
          { [paramName]: value },
        );
      } else {
        optimizedQb = optimizedQb.andWhere(
          `${qb.alias}.${field} = :${paramName}`,
          { [paramName]: value },
        );
      }
    }

    return optimizedQb;
  }

  /**
   * Select only specific columns to reduce data transfer
   * @param qb - Query builder
   * @param columns - Array of column names to select
   * @returns Modified query builder
   */
  static selectColumns<T>(
    qb: SelectQueryBuilder<T>,
    columns: string[],
  ): SelectQueryBuilder<T> {
    const alias = qb.alias;
    const selectedColumns = columns.map((col) => `${alias}.${col}`);
    return qb.select(selectedColumns);
  }

  /**
   * Add index hints for query optimization
   * @param qb - Query builder
   * @param indexName - Name of the index to use
   * @returns Modified query builder
   */
  static useIndex<T>(
    qb: SelectQueryBuilder<T>,
    indexName: string,
  ): SelectQueryBuilder<T> {
    // Note: Index hints are database-specific
    // This is a placeholder for future implementation
    return qb;
  }

  /**
   * Build optimized query with common patterns
   * @param qb - Query builder
   * @param options - Optimization options
   * @returns Modified query builder
   */
  static optimize<T>(
    qb: SelectQueryBuilder<T>,
    options: {
      relations?: string[];
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      filters?: Record<string, any>;
      columns?: string[];
    },
  ): SelectQueryBuilder<T> {
    let optimizedQb = qb;

    if (options.columns) {
      optimizedQb = this.selectColumns(optimizedQb, options.columns);
    }

    if (options.relations) {
      optimizedQb = this.eagerLoadRelations(optimizedQb, options.relations);
    }

    if (options.filters) {
      optimizedQb = this.filter(optimizedQb, options.filters);
    }

    if (options.sortBy) {
      optimizedQb = this.sort(optimizedQb, options.sortBy, options.sortOrder);
    }

    if (options.page && options.limit) {
      optimizedQb = this.paginate(optimizedQb, options.page, options.limit);
    }

    return optimizedQb;
  }
}
