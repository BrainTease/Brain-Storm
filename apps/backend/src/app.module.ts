import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentryModule } from '@sentry/nestjs/setup';
import * as redisStore from 'cache-manager-redis-store';

import { AccessControlModule } from './access-control/access-control.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ApiUsageInterceptor } from './api-usage/api-usage.interceptor';
import { ApiUsageModule } from './api-usage/api-usage.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth';
import { BatchModule } from './batch/batch.module';
import { BookingsModule } from './bookings/bookings.module';
import { CacheManagementModule } from './cache/cache-management.module';
import { CdnModule } from './cdn/cdn.module';
import { CertificatesModule } from './certificates/certificates.module';
import { CohortsModule } from './cohorts/cohorts.module';
import { CorrelationMiddleware } from './common/logger/correlation.middleware';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { CoursesModule } from './courses/courses.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DatabaseModule } from './database/database.module';
import { EmailModule } from './email/email.module';
import { ForumsModule } from './forums/forums.module';
import { GatewayLoggingInterceptor } from './gateway/gateway.interceptor';
import { GatewayModule } from './gateway/gateway.module';
import { GdprModule } from './gdpr/gdpr.module';
import { GovernanceModule } from './governance/governance.module';
import { GrantsModule } from './grants/grants.module';
import { AppGraphQLModule } from './graphql/graphql.module';
import { HealthModule } from './health/health.module';
import { ImportExportModule } from './import-export/import-export.module';
import { KycModule } from './kyc/kyc.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { MetricsModule } from './metrics/metrics.module';
import { ShutdownMiddleware, CacheHeadersMiddleware } from './middleware';
import { ModerationModule } from './moderation/moderation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments';
import { PayoutsModule } from './payouts/payouts.module';
import { ProgressModule } from './progress/progress.module';
import { QueueModule } from './queue/queue.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { UserRateLimitGuard } from './rate-limit/user-rate-limit.guard';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { RemindersModule } from './reminders/reminders.module';
import { SearchModule } from './search/search.module';
import { StellarModule } from './stellar/stellar.module';
import { UsersModule } from './users';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WsGatewayModule } from './ws-gateway/ws-gateway.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: config.get<string>('nodeEnv') !== 'production',
        extra: {
          // #805: pool config now flows through ConfigService (see configuration.ts + validation.schema.ts)
          max: config.get<number>('dbPool.max') ?? 20,
          min: config.get<number>('dbPool.min') ?? 5,
          connectionTimeoutMillis: config.get<number>('dbPool.acquireTimeout') ?? 30000,
          idleTimeoutMillis: config.get<number>('dbPool.idleTimeout') ?? 10000,
        },
        maxQueryExecutionTime: 5000,
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        url: config.get<string>('redis.url'),
        ttl: 60,
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl') || 60000,
            limit: config.get<number>('throttle.limit') || 100,
          },
        ],
        storage: new ThrottlerStorageRedisService(
          config.get<string>('redis.url') || 'redis://localhost:6379'
        ),
      }),
    }),
    AuthModule,
    CoursesModule,
    UsersModule,
    StellarModule,
    ProgressModule,
    CredentialsModule,
    LeaderboardModule,
    ForumsModule,
    NotificationsModule,
    RemindersModule,
    CertificatesModule,
    PayoutsModule,
    GdprModule,
    BookingsModule,
    HealthModule,
    MetricsModule,
    KycModule,
    RecommendationsModule,
    EmailModule,
    AnalyticsModule,
    WebhooksModule,
    ModerationModule,
    ImportExportModule,
    SearchModule,
    BatchModule,
    ApiUsageModule,
    QuizzesModule,
    CacheManagementModule,
    CohortsModule,
    CdnModule,
    AccessControlModule,
    RateLimitModule,
    AuditModule,
    AdminModule,
    QueueModule,
    GatewayModule,
    WsGatewayModule,
    AppGraphQLModule,
    PaymentsModule,
    DatabaseModule,
    GovernanceModule,
    GrantsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: UserRateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: ApiUsageInterceptor },
    { provide: APP_INTERCEPTOR, useClass: GatewayLoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // #1215: bind correlation ID first so every subsequent middleware / interceptor /
    // service can read it via getCorrelationId().
    consumer.apply(CorrelationMiddleware).forRoutes('*');
    consumer.apply(ShutdownMiddleware).forRoutes('*');
    // #707: attach cache-control / ETag headers on all routes
    consumer.apply(CacheHeadersMiddleware).forRoutes('*');
  }
}
