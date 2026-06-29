import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';

let pgContainer;
let dataSource: DataSource;

export async function setupIntegrationTest() {
  if (!pgContainer) {
    pgContainer = await new PostgreSqlContainer('postgres:15')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();
  }

  dataSource = new DataSource({
    type: 'postgres',
    host: pgContainer.getHost(),
    port: pgContainer.getPort(),
    username: 'test',
    password: 'test',
    database: 'test',
    entities: [__dirname + '/../../src/**/*.entity.{ts,js}'],
    migrations: [__dirname + '/../../src/migrations/*.{ts,js}'],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).overrideProvider(DataSource).useValue(dataSource).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  return { app, dataSource, server: app.getHttpServer() };
}

export async function teardownIntegrationTest(ctx) {
  await ctx.app?.close();
  await dataSource?.destroy();
}

export async function clearDatabase(ds: DataSource) {
  for (const entity of ds.entityMetadatas) {
    await ds.getRepository(entity.name).clear();
  }
}

export async function createAuthToken(server, email = `test${Date.now()}@test.com`, password = 'Test123!') {
  await request(server).post('/v1/auth/register').send({ username: email.split('@')[0], email, password });
  const res = await request(server).post('/v1/auth/login').send({ email, password });
  return res.body.accessToken || res.body.access_token;
}
