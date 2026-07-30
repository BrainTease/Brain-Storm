import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, SelectQueryBuilder } from 'typeorm';

@Injectable()
export class ReadReplicaService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  getReadConnection(): DataSource {
    const replicaHost = process.env.DATABASE_REPLICA_HOST;
    return replicaHost ? this.dataSource : this.dataSource;
  }

  async executeReadQuery<T>(queryBuilder: SelectQueryBuilder<T>): Promise<T[]> {
    return queryBuilder.getMany();
  }

  async executeReadOneQuery<T>(queryBuilder: SelectQueryBuilder<T>): Promise<T | null> {
    return queryBuilder.getOne();
  }
}
