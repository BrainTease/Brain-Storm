import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface PoolConfig {
  max: number;
  min: number;
  acquireTimeout: number;
  idleTimeout: number;
}

export const getPoolConfig = (): PoolConfig => ({
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '5'),
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000'),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000'),
});

export const createDataSourceOptions = (poolConfig: PoolConfig): Partial<TypeOrmModuleOptions> => ({
  extra: {
    max: poolConfig.max,
    min: poolConfig.min,
    connectionTimeoutMillis: poolConfig.acquireTimeout,
    idleTimeoutMillis: poolConfig.idleTimeout,
  },
  maxQueryExecutionTime: 5000,
});
