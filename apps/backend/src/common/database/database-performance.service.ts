import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { LoggerFactory } from '../logger/logger-factory';

/**
 * Database performance monitoring and optimization
 */
@Injectable()
export class DatabasePerformanceService {
  private readonly logger = this.loggerFactory.createLogger('DatabasePerformance');
  private readonly slowQueryThreshold = 1000; // ms

  constructor(
    private readonly dataSource: DataSource,
    private readonly loggerFactory: LoggerFactory,
  ) {
    this.setupQueryLogging();
  }

  /**
   * Setup query logging to detect slow queries
   */
  private setupQueryLogging(): void {
    this.dataSource.driver.connection.on('query', (query: string) => {
      this.logger.debug('Query executed', { query });
    });

    this.dataSource.driver.connection.on('query-slow', (time: number, query: string) => {
      if (time > this.slowQueryThreshold) {
        this.logger.warn('Slow query detected', {
          query,
          duration: time,
          threshold: this.slowQueryThreshold,
        });
      }
    });

    this.dataSource.driver.connection.on('query-error', (error: Error, query: string) => {
      this.logger.error('Query error', error, { query });
    });
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    connectionCount: number;
    activeConnections: number;
    cacheHitRatio?: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      // Get connection stats (PostgreSQL specific)
      const stats = await queryRunner.query(`
        SELECT 
          count(*) as connection_count,
          sum(case when state = 'active' then 1 else 0 end) as active_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      return {
        connectionCount: stats[0]?.connection_count || 0,
        activeConnections: stats[0]?.active_connections || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get database stats', error);
      return {
        connectionCount: 0,
        activeConnections: 0,
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Analyze query performance
   */
  async analyzeQuery(query: string): Promise<{
    plan: any[];
    duration: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    const startTime = Date.now();

    try {
      const plan = await queryRunner.query(`EXPLAIN ANALYZE ${query}`);
      const duration = Date.now() - startTime;

      this.logger.debug('Query analysis completed', {
        query,
        duration,
        planLength: plan.length,
      });

      return { plan, duration };
    } catch (error) {
      this.logger.error('Failed to analyze query', error, { query });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get missing indexes
   */
  async getMissingIndexes(): Promise<
    Array<{
      schemaName: string;
      tableName: string;
      indexName: string;
      indexDefinition: string;
    }>
  > {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      const missingIndexes = await queryRunner.query(`
        SELECT
          schemaname as schema_name,
          tablename as table_name,
          indexname as index_name,
          indexdef as index_definition
        FROM pg_indexes
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY tablename, indexname
      `);

      return missingIndexes.map((idx: any) => ({
        schemaName: idx.schema_name,
        tableName: idx.table_name,
        indexName: idx.index_name,
        indexDefinition: idx.index_definition,
      }));
    } catch (error) {
      this.logger.error('Failed to get missing indexes', error);
      return [];
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get table statistics
   */
  async getTableStats(tableName: string): Promise<{
    rowCount: number;
    sizeInMB: number;
    lastVacuum?: Date;
    lastAnalyze?: Date;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      const stats = await queryRunner.query(`
        SELECT
          n_live_tup as row_count,
          pg_size_bytes(pg_total_relation_size('${tableName}')) / 1024 / 1024 as size_mb,
          last_vacuum,
          last_analyze
        FROM pg_stat_user_tables
        WHERE relname = '${tableName}'
      `);

      if (stats.length === 0) {
        return { rowCount: 0, sizeInMB: 0 };
      }

      return {
        rowCount: stats[0].row_count || 0,
        sizeInMB: stats[0].size_mb || 0,
        lastVacuum: stats[0].last_vacuum,
        lastAnalyze: stats[0].last_analyze,
      };
    } catch (error) {
      this.logger.error('Failed to get table stats', error, { tableName });
      return { rowCount: 0, sizeInMB: 0 };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Vacuum and analyze table
   */
  async optimizeTable(tableName: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      this.logger.info('Starting table optimization', { tableName });

      await queryRunner.query(`VACUUM ANALYZE ${tableName}`);

      this.logger.info('Table optimization completed', { tableName });
    } catch (error) {
      this.logger.error('Failed to optimize table', error, { tableName });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(limit: number = 10): Promise<
    Array<{
      query: string;
      calls: number;
      totalTime: number;
      meanTime: number;
    }>
  > {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      const slowQueries = await queryRunner.query(`
        SELECT
          query,
          calls,
          total_time,
          mean_time
        FROM pg_stat_statements
        ORDER BY mean_time DESC
        LIMIT ${limit}
      `);

      return slowQueries.map((q: any) => ({
        query: q.query,
        calls: q.calls,
        totalTime: q.total_time,
        meanTime: q.mean_time,
      }));
    } catch (error) {
      this.logger.error('Failed to get slow queries', error);
      return [];
    } finally {
      await queryRunner.release();
    }
  }
}
