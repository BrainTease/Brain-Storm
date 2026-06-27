import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { CacheService, CACHE_HIT_COUNTER, CACHE_MISS_COUNTER } from './cache.service';
import { CacheManagementController } from './cache-management.controller';
import { CacheManagementService } from './cache-management.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [CoursesModule, EventEmitterModule.forRoot()],
  providers: [
    CacheService,
    CacheManagementService,
    CacheInvalidationService,
    makeCounterProvider({
      name: CACHE_HIT_COUNTER,
      help: 'Total number of cache hits',
      labelNames: ['key'],
    }),
    makeCounterProvider({
      name: CACHE_MISS_COUNTER,
      help: 'Total number of cache misses',
      labelNames: ['key'],
    }),
  ],
  controllers: [CacheManagementController],
  exports: [CacheService, CacheInvalidationService],
})
export class CacheManagementModule {}
